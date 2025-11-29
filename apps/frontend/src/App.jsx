/** Main App component with enterprise UI */

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';
import { useMemo } from 'react';
import logoImage from './assets/gg1.png';
import './styles/globals.css';
import './styles/components.css';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [callId, setCallId] = useState(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [rawLLMResponse, setRawLLMResponse] = useState(null);
  const [kbContext, setKbContext] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [postCallData, setPostCallData] = useState(null);

  // Calculate sentiment from transcripts
  const sentimentData = useMemo(() => {
    const customerTranscripts = transcripts.filter(t => t.speaker === 'customer');
    const text = customerTranscripts.map(t => t.text).join(' ').toLowerCase();
    
    const negativeKeywords = ['problem', 'issue', 'error', 'wrong', 'bad', 'not working', 'broken', 'frustrated', 'angry'];
    const positiveKeywords = ['thanks', 'thank you', 'good', 'great', 'excellent', 'happy', 'satisfied', 'perfect'];
    
    let negative = 0;
    let positive = 0;
    let neutral = 0;
    
    negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) negative++;
    });
    
    positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) positive++;
    });
    
    const total = negative + positive;
    if (total === 0) {
      neutral = 100;
    } else {
      negative = Math.round((negative / total) * 100);
      positive = Math.round((positive / total) * 100);
      neutral = 100 - negative - positive;
    }
    
    return { negative, neutral, positive };
  }, [transcripts]);

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
        console.log('[App] Compliance suggestions received:', data);
        console.log('[App] Raw LLM response in data:', data.raw_llm_response);
        // Clear timeout if it exists
        if (window.assistTimeoutId) {
          clearTimeout(window.assistTimeoutId);
          window.assistTimeoutId = null;
        }
        setSuggestions(data.suggestions || []);
        setRawLLMResponse(data.raw_llm_response || null);
        setKbContext(data.kb_context || null);
        console.log('[App] Set rawLLMResponse to:', data.raw_llm_response || null);
        console.log('[App] Set kbContext to:', data.kb_context ? `${data.kb_context.length} characters` : null);
        setIsLoading(false);
        // If no suggestions, show a message
        if (!data.suggestions || data.suggestions.length === 0) {
          console.log('[App] No compliance issues detected');
        }
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
  const handleAssist = useCallback(async () => {
    if (!callId) {
      setError('No active call');
      return;
    }

    if (transcripts.length === 0) {
      setError('No conversation transcript available yet');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuggestions([]);
      setRawLLMResponse(null); // Clear previous raw response
      
      // Set a timeout to clear loading state if no response comes
      const timeoutId = setTimeout(() => {
        console.warn('[App] Assist request timeout - no response received');
        setIsLoading(false);
        setError('Request timed out. Please try again.');
      }, 30000); // 30 second timeout
      
      // Store timeout ID to clear it when response arrives
      window.assistTimeoutId = timeoutId;
      
      // Send full conversation transcript (backend-agent will format it)
      // The transcript is already stored in backend-agent, so we just need to trigger the check
      await api.requestAssist(callId, '');
      // Suggestions will come via SSE (loading will be cleared in handleSSEMessage)
    } catch (err) {
      if (window.assistTimeoutId) {
        clearTimeout(window.assistTimeoutId);
        window.assistTimeoutId = null;
      }
      setError(err.message || 'Failed to request assistance');
      setIsLoading(false);
    }
  }, [callId, transcripts.length]);

  // Keyboard shortcut: Spacebar to trigger Assist button
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only trigger if spacebar is pressed
      if (event.code !== 'Space' && event.key !== ' ') {
        return;
      }

      // Don't trigger if user is typing in an input field, textarea, or contenteditable
      const target = event.target;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;

      if (isInputField) {
        return;
      }

      // Only trigger if call is active, not loading, and has transcripts
      if (isCallActive && !isLoading && transcripts.length > 0) {
        event.preventDefault(); // Prevent page scroll
        handleAssist();
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCallActive, isLoading, transcripts.length, handleAssist]);

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
          <img 
            src={logoImage} 
            alt="Logo" 
            style={{ 
              height: '48px', 
              width: 'auto',
              objectFit: 'contain'
            }} 
          />
          <h1 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            margin: 0
          }}>
            SamurAI
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

          {/* Customer Sentiment Section */}
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            height: 'fit-content'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
              color: 'var(--color-neutral-900)'
            }}>
              Customer Sentiment
            </h2>
            
            {/* Sentiment Icons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              marginBottom: 'var(--spacing-2)'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                opacity: sentimentData.negative > 20 ? 1 : 0.4
              }}>
                <FiTrendingDown size={24} color="var(--color-error)" />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)' }}>
                  Negative
                </span>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                opacity: sentimentData.neutral > 20 ? 1 : 0.4
              }}>
                <FiMinus size={24} color="var(--color-warning)" />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)' }}>
                  Neutral
                </span>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--spacing-1)',
                opacity: sentimentData.positive > 20 ? 1 : 0.4
              }}>
                <FiTrendingUp size={24} color="var(--color-success)" />
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-neutral-600)' }}>
                  Positive
                </span>
              </div>
            </div>

            {/* Sentiment Bar Graph */}
            <div style={{
              display: 'flex',
              height: '20px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--color-neutral-200)'
            }}>
              {sentimentData.negative > 0 && (
                <div style={{
                  width: `${sentimentData.negative}%`,
                  backgroundColor: 'var(--color-error)',
                  transition: 'width 0.3s ease'
                }} />
              )}
              {sentimentData.neutral > 0 && (
                <div style={{
                  width: `${sentimentData.neutral}%`,
                  backgroundColor: 'var(--color-warning)',
                  transition: 'width 0.3s ease'
                }} />
              )}
              {sentimentData.positive > 0 && (
                <div style={{
                  width: `${sentimentData.positive}%`,
                  backgroundColor: 'var(--color-success)',
                  transition: 'width 0.3s ease'
                }} />
              )}
            </div>
          </div>

          {/* Quick Actions Section */}
          <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-3)',
            height: 'fit-content'
          }}>
            <h2 style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
              color: 'var(--color-neutral-900)'
            }}>
              Quick Actions
            </h2>
            <div style={{
              color: 'var(--color-neutral-400)',
              fontSize: 'var(--font-size-sm)',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: 'var(--spacing-2)'
            }}>
              Actions will appear here
            </div>
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
          width: '480px',
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
            rawLLMResponse={rawLLMResponse}
            kbContext={kbContext}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
