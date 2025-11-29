/** Main App component with enterprise UI */

import { useState, useCallback } from 'react';
import { useSSE } from './hooks/useSSE';
import { useAudioStream } from './hooks/useAudioStream';
import { api } from './services/api';
import { CallControls } from './components/CallControls';
import { AssistButton } from './components/AssistButton';
import { ConversationPanel } from './components/ConversationPanel';
import { SentimentPanel } from './components/SentimentPanel';
import { ComplianceSuggestions } from './components/ComplianceSuggestions';
import { StatusIndicator } from './components/StatusIndicator';
import { ErrorAlert } from './components/ErrorAlert';
import { FiActivity } from 'react-icons/fi';
import './styles/globals.css';
import './styles/components.css';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [callId, setCallId] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postCallData, setPostCallData] = useState(null);

  // Handle transcriptions from audio stream
  const handleTranscription = useCallback((transcript) => {
    setTranscripts(prev => {
      const isFinal = transcript.isFinal !== undefined ? transcript.isFinal : true;
      const newTranscript = {
        text: transcript.text,
        timestamp: transcript.timestamp || new Date().toISOString(),
        speaker: transcript.speaker || 'unknown',
        isFinal: isFinal
      };

      // If it's an interim transcript, update the last one if it's also interim
      if (!isFinal && prev.length > 0) {
        const lastTranscript = prev[prev.length - 1];
        // Only update if last one is also interim and from same speaker
        if (!lastTranscript.isFinal && lastTranscript.speaker === newTranscript.speaker) {
          return [...prev.slice(0, -1), newTranscript];
        }
      }

      // Otherwise, append as new transcript
      return [...prev, newTranscript];
    });
  }, []);

  // Audio stream hook
  const { startRecording, stopRecording } = useAudioStream(handleTranscription);

  // SSE message handler
  const handleSSEMessage = useCallback((eventType, data) => {
    console.log('[App] SSE message:', eventType, data);

    switch (eventType) {
      case 'transcription':
        setTranscripts(prev => {
          const isFinal = data.isFinal !== undefined ? data.isFinal : true;
          const newTranscript = {
            text: data.text,
            timestamp: data.timestamp || new Date().toISOString(),
            speaker: data.speaker || 'unknown',
            isFinal: isFinal
          };

          // If it's an interim transcript, update the last one if it's also interim
          if (!isFinal && prev.length > 0) {
            const lastTranscript = prev[prev.length - 1];
            // Only update if last one is also interim and from same speaker
            if (!lastTranscript.isFinal && lastTranscript.speaker === newTranscript.speaker) {
              return [...prev.slice(0, -1), newTranscript];
            }
          }

          // Otherwise, append as new transcript
          return [...prev, newTranscript];
        });
        break;

      case 'compliance_suggestion':
        setSuggestions(data.suggestions || []);
        setIsLoading(false);
        break;

      case 'error':
        setError(data.message || 'An error occurred');
        setIsLoading(false);
        break;

      case 'call_start':
        setCallId(data.callId);
        setIsCallActive(true);
        setPostCallData(null); // Clear previous post-call data
        setTranscripts([]);
        setSuggestions([]);
        break;

      case 'call_end':
        setIsCallActive(false);
        // Fetch post-call summary
        if (data.callId) {
          api.getPostCallSummary(data.callId)
            .then(summary => {
              setPostCallData({
                callId: data.callId,
                transcripts: transcripts,
                complianceReport: summary
              });
            })
            .catch(err => {
              console.error('[App] Error fetching post-call summary:', err);
            });
        }
        break;

      case 'connection_status':
        // Connection status updates handled by useSSE hook
        break;

      default:
        console.log('[App] Unhandled event type:', eventType);
    }
  }, [transcripts]);

  // SSE connection (for compliance suggestions from backend)
  // Only connect if we have a callId and want to receive suggestions via backend
  const { connectionStatus, error: sseError } = useSSE(
    `${API_URL}/api/stream`,
    callId, // This will be set when recording starts
    handleSSEMessage
  );
  
  // Log SSE errors (less critical since we're using WebSocket for audio)
  if (sseError) {
    console.warn('[App] SSE connection error:', sseError);
  }

  // Start call - using audio stream
  const handleStartCall = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Start audio recording (captures tab + mic, streams to backend-agent)
      const newCallId = await startRecording();
      
      setCallId(newCallId);
      setIsCallActive(true);
      setPostCallData(null); // Clear previous post-call data
      setTranscripts([]);
      setSuggestions([]);
      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to start recording. Make sure to allow microphone and screen sharing permissions.');
      setIsLoading(false);
      console.error('[App] Error starting recording:', err);
    }
  };

  // Stop call - using audio stream
  const handleStopCall = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Stop audio recording
      const stoppedCallId = stopRecording();
      
      setIsCallActive(false);
      
      // Optionally fetch post-call summary
      if (stoppedCallId) {
        try {
          const summary = await api.getPostCallSummary(stoppedCallId);
          setPostCallData({
            callId: stoppedCallId,
            transcripts: transcripts,
            complianceReport: summary
          });
          setShowPostCall(true);
        } catch (err) {
          console.error('[App] Error fetching post-call summary:', err);
        }
      }
      
      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to stop recording');
      setIsLoading(false);
    }
  };

  // Request assist
  const handleAssist = async () => {
    if (!callId) {
      setError('No active call');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuggestions([]);
      
      // Get last 30-40 seconds of transcript (optional, backend-agent will extract if not provided)
      const recentTranscripts = transcripts.slice(-10).map(t => t.text).join(' ');
      
      await api.requestAssist(callId, recentTranscripts);
      // Suggestions will come via SSE
    } catch (err) {
      setError(err.message || 'Failed to request assistance');
      setIsLoading(false);
    }
  };

  return (
    <div className="app" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--color-neutral-50)'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'var(--color-white)',
        borderBottom: '1px solid var(--color-neutral-200)',
        padding: 'var(--spacing-4) var(--spacing-6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-sm)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
          <FiActivity size={24} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            margin: 0
          }}>
            Compliance Support AI Agent
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)' }}>
          <StatusIndicator status={connectionStatus} />
          {callId && (
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-neutral-600)',
              fontFamily: 'var(--font-family-mono)'
            }}>
              Call: {callId.substring(0, 8)}...
            </div>
          )}
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: 'var(--spacing-3) var(--spacing-6)',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid var(--color-error)'
        }}>
          <ErrorAlert 
            message={error} 
            onDismiss={() => setError(null)} 
          />
        </div>
      )}

      {/* Main Content - Three Panel Layout */}
      <main style={{
        flex: 1,
        display: 'flex',
        gap: 'var(--spacing-4)',
        padding: 'var(--spacing-4)',
        overflow: 'hidden'
      }}>
        {/* Left Panel - Controls */}
        <div style={{
          width: '320px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-4)',
          flexShrink: 0
        }}>
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)',
            height: 'fit-content'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
              color: 'var(--color-neutral-900)'
            }}>
              Call Controls
            </h2>
            <CallControls
              isActive={isCallActive}
              onStart={handleStartCall}
              onStop={handleStopCall}
              isLoading={isLoading}
            />
            <AssistButton
              onClick={handleAssist}
              disabled={!isCallActive}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Middle Panel - Conversation */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-neutral-200)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: 'var(--spacing-5)',
            borderBottom: '1px solid var(--color-neutral-200)',
            backgroundColor: 'var(--color-neutral-50)'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
              color: 'var(--color-neutral-900)'
            }}>
              Conversation
            </h2>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ConversationPanel transcripts={transcripts} />
          </div>
        </div>

        {/* Right Panel - Sentiment & Suggestions & Post-Call Analysis */}
        <div style={{
          width: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-4)',
          flexShrink: 0,
          overflow: 'hidden'
        }}>
          <SentimentPanel 
            transcripts={transcripts} 
            suggestions={suggestions}
            postCallData={postCallData}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
