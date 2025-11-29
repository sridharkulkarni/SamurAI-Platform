/** Audio streaming hook - captures tab and mic audio, streams to backend-agent */

import { useRef, useCallback } from 'react';

// Backend-agent WebSocket URL for audio streaming
// Default: ws://localhost:8000/audio
// Can be overridden with VITE_BACKEND_AGENT_WS_URL environment variable
const BACKEND_AGENT_WS_URL = import.meta.env.VITE_BACKEND_AGENT_WS_URL || 'ws://localhost:8000/audio';
const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BUFFER_SIZE = 4096;
const SEND_INTERVAL = 50; // Send every 50ms

// Helper function to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192; // Process in chunks to avoid stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export function useAudioStream(onTranscription) {
  const tabStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const customerProcessorRef = useRef(null);
  const agentProcessorRef = useRef(null);
  const callIdRef = useRef(null);
  const isActiveRef = useRef(false);

  const generateCallId = useCallback(() => {
    return 'call-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }, []);

  const processAudioStream = useCallback((stream, source) => {
    // Create AudioContext for processing
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: SAMPLE_RATE
      });
    }

    // Create source from stream
    const sourceNode = audioContextRef.current.createMediaStreamSource(stream);

    // Create script processor for audio processing
    const processor = audioContextRef.current.createScriptProcessor(BUFFER_SIZE, CHANNELS, CHANNELS);

    let lastSendTime = 0;
    let audioChunkCount = 0;

    processor.onaudioprocess = (e) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      const inputData = e.inputBuffer.getChannelData(0);

      // Check if there's actual audio (not silence)
      let hasAudio = false;
      let maxAmplitude = 0;
      for (let i = 0; i < inputData.length; i++) {
        const abs = Math.abs(inputData[i]);
        if (abs > 0.01) { // Threshold for silence detection
          hasAudio = true;
        }
        maxAmplitude = Math.max(maxAmplitude, abs);
      }

      // Only process if there's actual audio
      if (!hasAudio) {
        return;
      }

      const now = Date.now();
      if (now - lastSendTime < SEND_INTERVAL) {
        return; // Throttle sending
      }
      lastSendTime = now;

      // Convert Float32Array to Int16Array (PCM)
      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        // Clamp and convert to 16-bit integer
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const base64Audio = arrayBufferToBase64(pcmData.buffer);

      audioChunkCount++;
      if (audioChunkCount % 20 === 0) { // Log every 20 chunks (~1 second)
        console.log(`[${source}] Sent audio chunk #${audioChunkCount}, amplitude: ${maxAmplitude.toFixed(3)}`);
      }

      // Send to backend
      try {
        wsRef.current.send(JSON.stringify({
          source: source,
          audio: base64Audio,
          mime: 'audio/pcm'
        }));
      } catch (err) {
        console.error(`Error sending ${source} audio:`, err);
      }
    };

    // Connect source to processor
    sourceNode.connect(processor);
    processor.connect(audioContextRef.current.destination); // Still need to connect to avoid errors

    console.log(`[${source}] Audio stream processor initialized`);

    return processor;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      if (isActiveRef.current) {
        console.warn('Recording already active');
        return;
      }

      // Generate call ID
      callIdRef.current = generateCallId();

      // Connect to WebSocket
      const ws = new WebSocket(BACKEND_AGENT_WS_URL);
      wsRef.current = ws;

      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log('[AudioStream] WebSocket connected');
          // Send callId to backend
          ws.send(JSON.stringify({ callId: callIdRef.current }));
          resolve();
        };

        ws.onerror = (error) => {
          console.error('[AudioStream] WebSocket error:', error);
          reject(error);
        };

        ws.onclose = () => {
          console.log('[AudioStream] WebSocket disconnected');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Handle transcription messages
            if (message.type === 'transcription' && message.data) {
              const { text, speaker, isFinal } = message.data;
              if (text && onTranscription) {
                onTranscription({
                  text,
                  speaker: speaker || 'unknown',
                  isFinal: isFinal !== false,
                  timestamp: message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString()
                });
              }
            }
          } catch (err) {
            console.error('[AudioStream] Error parsing WebSocket message:', err);
          }
        };
      });

      // 1. Capture Ozontel tab audio (CUSTOMER audio - speaker output from the call)
      // Note: tab/speaker audio is ALWAYS customer
      const tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,  // Need video=true for audio to work
        audio: true
      });

      // Stop the video track since we only need audio
      const videoTracks = tabStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());

      // 2. Capture microphone audio (AGENT audio - agent speaking into mic)
      // Note: microphone input is ALWAYS agent
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: CHANNELS,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      tabStreamRef.current = tabStream;
      micStreamRef.current = micStream;

      // 3. Process and stream both audio streams
      // Create audio-only stream from tab
      const tabAudioStream = new MediaStream(tabStream.getAudioTracks());

      // Process CUSTOMER audio (from tab/speaker) - ALWAYS labeled as 'customer'
      customerProcessorRef.current = processAudioStream(tabAudioStream, 'customer');

      // Process AGENT audio (from microphone) - ALWAYS labeled as 'agent'
      agentProcessorRef.current = processAudioStream(micStream, 'agent');

      isActiveRef.current = true;

      return callIdRef.current;
    } catch (err) {
      console.error('[AudioStream] Error starting recording:', err);
      throw err;
    }
  }, [generateCallId, processAudioStream, onTranscription]);

  const stopRecording = useCallback(() => {
    // Stop audio processors
    if (customerProcessorRef.current) {
      customerProcessorRef.current.disconnect();
      customerProcessorRef.current = null;
    }
    if (agentProcessorRef.current) {
      agentProcessorRef.current.disconnect();
      agentProcessorRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media streams
    if (tabStreamRef.current) {
      tabStreamRef.current.getTracks().forEach(t => t.stop());
      tabStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    isActiveRef.current = false;
    const callId = callIdRef.current;
    callIdRef.current = null;

    return callId;
  }, []);

  return {
    startRecording,
    stopRecording,
    isActive: isActiveRef.current,
    callId: callIdRef.current
  };
}

