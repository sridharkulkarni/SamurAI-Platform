/** Status indicator component */

export function StatusIndicator({ status, label }) {
  const statusClass = 
    status === 'connected' ? 'status-connected' :
    status === 'disconnected' ? 'status-disconnected' :
    status === 'reconnecting' ? 'status-reconnecting' :
    'status-disconnected';

  const displayLabel = label || 
    (status === 'connected' ? 'Connected' :
     status === 'disconnected' ? 'Disconnected' :
     status === 'reconnecting' ? 'Reconnecting...' :
     'Unknown');

  return (
    <div className={`status-indicator ${statusClass}`}>
      <span className="status-dot" aria-hidden="true"></span>
      <span>{displayLabel}</span>
    </div>
  );
}

