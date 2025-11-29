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
          {isLoading ? 'Initializing...' : 'Start Call Session'}
        </button>
      ) : (
        <button
          className="btn btn-danger"
          onClick={onStop}
          disabled={isLoading}
          aria-label="End call"
        >
          <FiSquare size={18} />
          {isLoading ? 'Ending Session...' : 'End Call Session'}
        </button>
      )}
    </div>
  );
}

