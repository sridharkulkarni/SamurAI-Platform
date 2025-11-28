"""Deepgram streaming client - Using Deepgram SDK v3 API"""

import os
import asyncio
import websockets
import json
from deepgram import DeepgramClient
from dotenv import load_dotenv

load_dotenv()

DEEPGRAM_API_KEY = os.getenv('DEEPGRAM_API_KEY')


class DeepgramStreamingClient:
    def __init__(self, on_transcription_callback):
        """
        Initialize Deepgram streaming client
        
        Args:
            on_transcription_callback: Async callback function(text: str, is_final: bool, speaker: str = None)
        """
        self.api_key = DEEPGRAM_API_KEY
        self.on_transcription_callback = on_transcription_callback
        self.websocket = None
        self.call_id = None
        self.task = None

    async def start_stream(self, call_id: str):
        """Start Deepgram streaming connection using WebSocket"""
        self.call_id = call_id
        
        # Deepgram WebSocket URL
        url = f"wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&smart_format=true&encoding=linear16&sample_rate=44100&channels=1&interim_results=true"
        
        headers = {
            "Authorization": f"Token {self.api_key}"
        }
        
        try:
            # Connect to Deepgram WebSocket
            self.websocket = await websockets.connect(url, extra_headers=headers)
            print(f"[Deepgram] Connected for call {self.call_id}")
            
            # Start listening task
            self.task = asyncio.create_task(self._listen())
            
        except Exception as e:
            print(f"[Deepgram] Error connecting: {e}")
            raise

    async def _listen(self):
        """Listen for messages from Deepgram"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    
                    # Handle transcription results
                    if 'channel' in data and 'alternatives' in data['channel']:
                        alternatives = data['channel']['alternatives']
                        if alternatives and len(alternatives) > 0:
                            transcript = alternatives[0].get('transcript', '')
                            is_final = data.get('is_final', False)
                            
                            if transcript:
                                await self.on_transcription_callback(transcript, is_final)
                    
                    # Handle errors
                    if 'error' in data:
                        error_msg = data['error']
                        print(f"[Deepgram] Error: {error_msg}")
                        await self.on_transcription_callback("", False, error=error_msg)
                        
                except json.JSONDecodeError as e:
                    print(f"[Deepgram] Error parsing message: {e}")
                except Exception as e:
                    print(f"[Deepgram] Error processing message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            print(f"[Deepgram] Connection closed for call {self.call_id}")
        except Exception as e:
            print(f"[Deepgram] Listen error: {e}")

    async def send_audio(self, audio_data: bytes):
        """Send audio chunk to Deepgram"""
        if self.websocket:
            try:
                await self.websocket.send(audio_data)
            except Exception as e:
                print(f"[Deepgram] Error sending audio: {e}")

    async def stop_stream(self):
        """Stop Deepgram streaming connection"""
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        
        if self.websocket:
            try:
                await self.websocket.close()
            except Exception:
                pass
            self.websocket = None
        
        self.call_id = None
