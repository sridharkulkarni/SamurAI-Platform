/** Conversation panel with chat bubble style transcriptions */

import { useEffect, useRef } from 'react';
import { FiUser, FiHeadphones } from 'react-icons/fi';

export function ConversationPanel({ transcripts = [] }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      // Always scroll to bottom when new transcripts arrive
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [transcripts]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    } catch (e) {
      return '';
    }
  };

  if (transcripts.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-neutral-400)',
        fontSize: 'var(--font-size-base)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: 'var(--spacing-2)', fontWeight: 'var(--font-weight-medium)' }}>
            No active conversation
          </p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-500)' }}>
            Start a call session to view real-time transcriptions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: 'var(--spacing-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-4)'
      }}
    >
      {transcripts.map((transcript, index) => {
        const isAgent = transcript.speaker === 'agent';
        const isFinal = transcript.isFinal !== undefined ? transcript.isFinal : true;
        const timeDisplay = formatTime(transcript.timestamp);

        return (
          <div
            key={index}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--spacing-2)',
              opacity: isFinal ? 1 : 0.7
            }}
          >
            {/* Speaker label and timestamp */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              marginBottom: 'var(--spacing-1)',
              paddingLeft: isAgent ? 0 : 'var(--spacing-3)',
              paddingRight: isAgent ? 'var(--spacing-3)' : 0,
              justifyContent: isAgent ? 'flex-start' : 'flex-end'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-2)',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-neutral-600)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {isAgent ? (
                  <>
                    <FiUser size={14} />
                    <span>Agent</span>
                  </>
                ) : (
                  <>
                    <FiHeadphones size={14} />
                    <span>Customer</span>
                  </>
                )}
                {timeDisplay && (
                  <span style={{ color: 'var(--color-neutral-400)', fontWeight: 'normal' }}>
                    ({timeDisplay})
                  </span>
                )}
              </div>
            </div>

            {/* Chat bubble */}
            <div style={{
              display: 'flex',
              justifyContent: isAgent ? 'flex-start' : 'flex-end',
              paddingLeft: isAgent ? 0 : 'var(--spacing-8)',
              paddingRight: isAgent ? 'var(--spacing-8)' : 0
            }}>
              <div style={{
                maxWidth: '75%',
                padding: 'var(--spacing-3) var(--spacing-4)',
                borderRadius: 'var(--radius-lg)',
                backgroundColor: isAgent ? 'var(--color-neutral-100)' : 'var(--color-neutral-800)',
                color: isAgent ? 'var(--color-neutral-900)' : 'var(--color-white)',
                fontSize: 'var(--font-size-base)',
                lineHeight: 'var(--line-height-relaxed)',
                fontStyle: isFinal ? 'normal' : 'italic',
                boxShadow: 'var(--shadow-sm)',
                wordWrap: 'break-word'
              }}>
                {transcript.text}
              </div>
            </div>

            {/* Sentiment/Intent tags (placeholder for future) */}
            {isFinal && (
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-2)',
                paddingLeft: isAgent ? 0 : 'var(--spacing-3)',
                paddingRight: isAgent ? 'var(--spacing-3)' : 0,
                justifyContent: isAgent ? 'flex-start' : 'flex-end',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  padding: '2px var(--spacing-2)',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-neutral-200)',
                  color: 'var(--color-neutral-700)'
                }}>
                  Neutral
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

