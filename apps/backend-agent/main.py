"""FastAPI application with WebSocket endpoints"""

import os
import json
import uuid
import asyncio
import base64
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import (
    init_database,
    create_call,
    update_call_status,
    save_transcript,
    save_compliance_report,
    get_call_transcripts,
    get_compliance_report
)
from deepgram_client import DeepgramStreamingClient
from compliance import ComplianceChecker

load_dotenv()

app = FastAPI(title="Compliance Support AI Agent - Backend Agent")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For MVP, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to handle ngrok browser warning bypass
@app.middleware("http")
async def bypass_ngrok_warning(request, call_next):
    """Bypass ngrok browser warning for WebSocket connections"""
    # Check if this is a WebSocket upgrade request
    if request.headers.get("upgrade", "").lower() == "websocket":
        # Add ngrok-skip-browser-warning header if not present
        if "ngrok-skip-browser-warning" not in request.headers:
            # This will be handled by the WebSocket endpoint
            pass
    response = await call_next(request)
    return response

# Initialize database
init_database()

# Global state
active_calls: Dict[str, Dict[str, Any]] = {}  # call_id -> {deepgram_client, backend_ws, transcripts}
backend_connections: Dict[str, WebSocket] = {}  # call_id -> backend WebSocket
audio_connections: Dict[str, WebSocket] = {}  # call_id -> audio WebSocket (for sending transcriptions back)
compliance_checker = ComplianceChecker()


async def send_to_backend(call_id: str, message: dict):
    """Send message to backend via WebSocket"""
    if call_id in backend_connections:
        try:
            ws = backend_connections[call_id]
            await ws.send_text(json.dumps(message))
        except Exception as e:
            print(f"[Backend-Agent] Error sending to backend: {e}")


async def on_transcription(call_id: str, text: str, is_final: bool, speaker: Optional[str] = None, source: Optional[str] = None):
    """Handle transcription from Deepgram"""
    if not text:
        return

    timestamp = datetime.utcnow().isoformat()
    
    # LOG: Print transcript only
    print(f"[Backend-Agent] Transcript: '{text}' | call_id: {call_id} | source: {source} | is_final: {is_final}")

    # Store transcript in memory
    if call_id not in active_calls:
        return

    if 'transcripts' not in active_calls[call_id]:
        active_calls[call_id]['transcripts'] = []

    # Use source from audio message if available, otherwise use speaker from Deepgram
    final_speaker = source if source else speaker
    # Map "agent"/"customer" to speaker format
    if final_speaker in ['agent', 'customer']:
        speaker_label = final_speaker
    else:
        speaker_label = final_speaker

    transcript_segment = {
        'text': text,
        'timestamp': timestamp,
        'speaker': speaker_label,
        'is_final': is_final
    }
    active_calls[call_id]['transcripts'].append(transcript_segment)

    # Save to database
    save_transcript(call_id, text, timestamp, speaker_label)

    # Send to backend
    message = {
        'type': 'transcription',
        'callId': call_id,
        'timestamp': int(datetime.utcnow().timestamp() * 1000),
        'data': {
            'text': text,
            'speaker': speaker_label,
            'isFinal': is_final
        }
    }
    await send_to_backend(call_id, message)
    
    # Also send transcription back to audio WebSocket client
    if call_id in audio_connections:
        try:
            ws = audio_connections[call_id]
            await ws.send_text(json.dumps(message))
        except Exception as e:
            print(f"[Backend-Agent] Error sending transcription to audio client: {e}")


@app.websocket("/audio")
async def audio_websocket(websocket: WebSocket):
    """WebSocket endpoint for desktop app (JSON messages with base64 audio)"""
    # Accept WebSocket connection (bypasses ngrok warning)
    await websocket.accept()
    call_id = None
    deepgram_client = None

    try:
        # Store current source for this call (will be updated per message)
        current_source = {'value': None}
        
        # Receive messages in JSON format
        while True:
            message_text = await websocket.receive_text()
            try:
                message_data = json.loads(message_text)
                
                # Handle callId message (first message or callId update)
                if 'callId' in message_data:
                    new_call_id = message_data.get('callId') or str(uuid.uuid4())
                    if not call_id or call_id != new_call_id:
                        # Clean up old call_id connection if changing
                        if call_id and call_id in audio_connections:
                            del audio_connections[call_id]
                        
                        call_id = new_call_id
                        # Store audio WebSocket connection for this call
                        audio_connections[call_id] = websocket
                        
                        # Initialize call
                        create_call(call_id)
                        active_calls[call_id] = {
                            'transcripts': [],
                            'started_at': datetime.utcnow().isoformat()
                        }
                        
                        # Initialize Deepgram client
                        async def transcription_callback(text, is_final, speaker=None, source=None):
                            # Use the current source from the most recent audio message
                            await on_transcription(call_id, text, is_final, speaker, current_source['value'])
                        
                        deepgram_client = DeepgramStreamingClient(transcription_callback)
                        await deepgram_client.start_stream(call_id)
                        active_calls[call_id]['deepgram_client'] = deepgram_client
                        active_calls[call_id]['current_source'] = current_source
                        
                        # Send call_start message to backend
                        if call_id in backend_connections:
                            message = {
                                'type': 'call_start',
                                'callId': call_id,
                                'timestamp': int(datetime.utcnow().timestamp() * 1000),
                                'data': {'callId': call_id}
                            }
                            await send_to_backend(call_id, message)
                        
                        print(f"[Backend-Agent] Audio WebSocket connected for call {call_id}")
                        continue
                
                # Handle audio message format: { "source": "agent"|"customer", "audio": "base64...", "mime": "..." }
                # Note: source is ALWAYS "agent" for microphone input, "customer" for tab/speaker audio
                if 'audio' in message_data and 'source' in message_data:
                    if not call_id:
                        # Generate call_id if not set yet
                        call_id = str(uuid.uuid4())
                        # Store audio WebSocket connection for this call
                        audio_connections[call_id] = websocket
                        
                        create_call(call_id)
                        active_calls[call_id] = {
                            'transcripts': [],
                            'started_at': datetime.utcnow().isoformat()
                        }
                        
                        # Initialize Deepgram client
                        async def transcription_callback(text, is_final, speaker=None, source=None):
                            await on_transcription(call_id, text, is_final, speaker, current_source['value'])
                        
                        deepgram_client = DeepgramStreamingClient(transcription_callback)
                        await deepgram_client.start_stream(call_id)
                        active_calls[call_id]['deepgram_client'] = deepgram_client
                        active_calls[call_id]['current_source'] = current_source
                    
                    source = message_data.get('source', 'unknown')  # "agent" (mic) or "customer" (tab/speaker)
                    audio_base64 = message_data.get('audio', '')
                    mime_type = message_data.get('mime', 'audio/pcm')
                    
                    # Validate source
                    if source not in ['agent', 'customer']:
                        print(f"[Backend-Agent] Warning: Invalid source '{source}', expected 'agent' or 'customer'")
                        source = 'unknown'
                    
                    # Update current source for this call (used in transcription callback)
                    current_source['value'] = source
                    
                    if audio_base64:
                        try:
                            # Decode base64 audio to bytes
                            audio_bytes = base64.b64decode(audio_base64)
                            
                            # Send decoded audio to Deepgram with source info
                            # Note: mic = agent, tab/speaker = customer
                            if deepgram_client:
                                # Store source before sending to ensure it's available when transcription comes back
                                await deepgram_client.send_audio(audio_bytes, source=source)
                                print(f"[Backend-Agent] Sent audio chunk from {source} ({len(audio_bytes)} bytes) to Deepgram")
                            
                        except base64.binascii.Error as e:
                            print(f"[Backend-Agent] Error decoding base64 audio from {source}: {e}")
                        except Exception as e:
                            print(f"[Backend-Agent] Error processing audio from {source}: {e}")
                            import traceback
                            traceback.print_exc()
                    else:
                        print(f"[Backend-Agent] Received empty audio data from {source}")
                        
            except json.JSONDecodeError as e:
                print(f"[Backend-Agent] Error parsing JSON message: {e}")
            except Exception as e:
                print(f"[Backend-Agent] Error processing message: {e}")

    except WebSocketDisconnect:
        print(f"[Backend-Agent] Audio WebSocket disconnected for call {call_id}")
    except Exception as e:
        print(f"[Backend-Agent] Error in audio WebSocket: {e}")
    finally:
        # Cleanup
        if call_id and call_id in audio_connections:
            del audio_connections[call_id]
        
        if call_id and call_id in active_calls:
            if 'deepgram_client' in active_calls[call_id]:
                await active_calls[call_id]['deepgram_client'].stop_stream()

            # End call
            update_call_status(call_id, 'ended', datetime.utcnow().isoformat())

            # Generate post-call report
            if 'transcripts' in active_calls[call_id]:
                report = await compliance_checker.generate_post_call_report(
                    active_calls[call_id]['transcripts'],
                    call_id
                )
                save_compliance_report(call_id, report['report'], report['issues_found'])

                # Send call_end message to backend
                if call_id in backend_connections:
                    message = {
                        'type': 'call_end',
                        'callId': call_id,
                        'timestamp': int(datetime.utcnow().timestamp() * 1000),
                        'data': {'callId': call_id}
                    }
                    await send_to_backend(call_id, message)

            del active_calls[call_id]


@app.websocket("/backend")
async def backend_websocket(websocket: WebSocket):
    """WebSocket endpoint for backend (JSON messages)"""
    await websocket.accept()
    call_id = None

    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)

            message_type = message_data.get('type')
            call_id = message_data.get('callId')
            
            print(f"[Backend-Agent] ← Backend [WS] | callId: {call_id} | type: {message_type} | data: {json.dumps(message_data.get('data', {}), indent=2)}")

            if not call_id:
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'callId': '',
                    'timestamp': int(datetime.utcnow().timestamp() * 1000),
                    'data': {'message': 'callId is required'}
                }))
                continue

            # Store backend connection
            backend_connections[call_id] = websocket

            if message_type == 'assist_request':
                # Handle assist request
                assist_data = message_data.get('data', {})
                transcript_text = assist_data.get('transcript')

                # Get transcript segments from memory
                if call_id in active_calls and 'transcripts' in active_calls[call_id]:
                    transcript_segments = active_calls[call_id]['transcripts']
                else:
                    transcript_segments = []

                print(f"[Backend-Agent] Assist request received for call {call_id}, transcript segments: {len(transcript_segments)}")

                try:
                    # Check compliance
                    suggestions = await compliance_checker.check_compliance(
                        transcript_segments,
                        call_id
                    )

                    print(f"[Backend-Agent] Compliance check completed, suggestions: {len(suggestions)}")

                    # Send response (even if empty - frontend will handle it)
                    response = {
                        'type': 'assist_response',
                        'callId': call_id,
                        'timestamp': int(datetime.utcnow().timestamp() * 1000),
                        'data': {
                            'suggestions': [s.dict() for s in suggestions]
                        }
                    }
                    await send_to_backend(call_id, response)
                    print(f"[Backend-Agent] Assist response sent to backend")
                except Exception as e:
                    print(f"[Backend-Agent] Error during compliance check: {e}")
                    import traceback
                    traceback.print_exc()
                    # Send error response
                    error_response = {
                        'type': 'assist_response',
                        'callId': call_id,
                        'timestamp': int(datetime.utcnow().timestamp() * 1000),
                        'data': {
                            'suggestions': [],
                            'error': str(e)
                        }
                    }
                    await send_to_backend(call_id, error_response)

            elif message_type == 'call_start':
                # Initialize call if not exists
                if call_id not in active_calls:
                    create_call(call_id)
                    active_calls[call_id] = {
                        'transcripts': [],
                        'started_at': datetime.utcnow().isoformat()
                    }

            elif message_type == 'call_end':
                # End call
                if call_id in active_calls:
                    update_call_status(call_id, 'ended', datetime.utcnow().isoformat())

                    # Generate post-call report
                    if 'transcripts' in active_calls[call_id]:
                        report = await compliance_checker.generate_post_call_report(
                            active_calls[call_id]['transcripts'],
                            call_id
                        )
                        save_compliance_report(call_id, report['report'], report['issues_found'])

                    del active_calls[call_id]

                if call_id in backend_connections:
                    del backend_connections[call_id]

    except WebSocketDisconnect:
        print(f"[Backend-Agent] Backend WebSocket disconnected for call {call_id}")
        if call_id and call_id in backend_connections:
            del backend_connections[call_id]
    except Exception as e:
        print(f"[Backend-Agent] Error in backend WebSocket: {e}")
        if call_id and call_id in backend_connections:
            del backend_connections[call_id]


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "backend-agent"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

