/** Professional transcription display component */

import { useEffect, useRef } from 'react';
import { FiUser, FiHeadphones } from 'react-icons/fi';

export function TranscriptionDisplay({ transcripts = [] }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new transcripts arrive (smooth scroll)
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, [transcripts]);

  if (transcripts.length === 0) {
    return (
      <div className="transcription-container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-neutral-500)',
        minHeight: '200px'
      }}>
        <p>No transcriptions yet. Start a call to see real-time transcriptions.</p>
      </div>
    );
  }

  return (
    <div className="transcription-container" ref={containerRef}>
      {transcripts.map((transcript, index) => {
        const isAgent = transcript.speaker === 'agent';
        const Icon = isAgent ? FiUser : FiHeadphones;
        const speakerLabel = isAgent ? 'Agent' : 'Customer';
        const isFinal = transcript.isFinal !== undefined ? transcript.isFinal : true;
        
        // Format timestamp
        let timeDisplay = '';
        if (transcript.timestamp) {
          try {
            const date = new Date(transcript.timestamp);
            timeDisplay = date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false
            });
          } catch (e) {
            timeDisplay = '';
          }
        }

        return (
          <div 
            key={index} 
            className="transcription-segment"
            style={{
              opacity: isFinal ? 1 : 0.7,
              fontStyle: isFinal ? 'normal' : 'italic'
            }}
          >
            <div className="transcription-header">
              <div className="transcription-header-left">
                <Icon size={16} style={{ color: 'var(--color-neutral-500)' }} />
                <span className="font-medium">{speakerLabel}</span>
                {!isFinal && (
                  <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-neutral-400)',
                    fontStyle: 'italic',
                    marginLeft: 'var(--spacing-2)'
                  }}>
                    (typing...)
                  </span>
                )}
              </div>
              {timeDisplay && (
                <span className="transcription-timestamp">
                  {timeDisplay}
                </span>
              )}
            </div>
            <div 
              className="transcription-text"
              style={{
                color: isFinal ? 'var(--color-neutral-900)' : 'var(--color-neutral-600)'
              }}
            >
              {transcript.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

