/** Professional transcription display component */

import { useEffect, useRef } from 'react';
import { FiUser, FiHeadphones } from 'react-icons/fi';

export function TranscriptionDisplay({ transcripts = [] }) {
  const containerRef = useRef(null);

  // Auto-scroll to bottom when new transcripts arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
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

        return (
          <div key={index} className="transcription-segment">
            <div className="transcription-header">
              <Icon size={16} style={{ color: 'var(--color-neutral-500)' }} />
              <span className="font-medium">{speakerLabel}</span>
              {transcript.timestamp && (
                <span className="transcription-timestamp">
                  {new Date(transcript.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="transcription-text">{transcript.text}</div>
          </div>
        );
      })}
    </div>
  );
}

