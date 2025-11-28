/** Professional call controls component */

import { FiPlay, FiSquare } from 'react-icons/fi';

export function CallControls({ 
  isActive, 
  onStart, 
  onStop, 
  isLoading = false 
}) {
  return (
    <div style={{ 
      display: 'flex', 
      gap: 'var(--spacing-4)',
      alignItems: 'center'
    }}>
      {!isActive ? (
        <button
          className="btn btn-primary"
          onClick={onStart}
          disabled={isLoading}
          aria-label="Start call"
        >
          <FiPlay size={18} />
          {isLoading ? 'Starting...' : 'Start Recording'}
        </button>
      ) : (
        <button
          className="btn btn-danger"
          onClick={onStop}
          disabled={isLoading}
          aria-label="Stop call"
        >
          <FiSquare size={18} />
          {isLoading ? 'Stopping...' : 'Stop Recording'}
        </button>
      )}
    </div>
  );
}

