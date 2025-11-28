/** Enterprise-grade compliance suggestions component */

import { 
  FiAlertTriangle, 
  FiAlertCircle, 
  FiInfo, 
  FiCheckCircle 
} from 'react-icons/fi';

export function ComplianceSuggestions({ suggestions = [] }) {
  if (suggestions.length === 0) {
    return (
      <div style={{
        padding: 'var(--spacing-6)',
        textAlign: 'center',
        color: 'var(--color-neutral-500)'
      }}>
        <p>No compliance suggestions yet. Click "Assist" to check compliance.</p>
      </div>
    );
  }

  const getIcon = (type) => {
    switch (type) {
      case 'error':
        return <FiAlertCircle size={20} />;
      case 'warning':
        return <FiAlertTriangle size={20} />;
      case 'success':
        return <FiCheckCircle size={20} />;
      default:
        return <FiInfo size={20} />;
    }
  };

  const getColor = (type) => {
    switch (type) {
      case 'error':
        return 'var(--color-error)';
      case 'warning':
        return 'var(--color-warning)';
      case 'success':
        return 'var(--color-success)';
      default:
        return 'var(--color-info)';
    }
  };

  return (
    <div className="compliance-suggestions">
      {suggestions.map((suggestion, index) => {
        const iconColor = getColor(suggestion.type);

        return (
          <div key={index} className="compliance-card">
            <div className="compliance-card-header">
              <div style={{ color: iconColor }}>
                {getIcon(suggestion.type)}
              </div>
              <span 
                className="compliance-card-type"
                style={{ color: iconColor }}
              >
                {suggestion.type}
              </span>
              {suggestion.severity && (
                <span className="badge badge-neutral" style={{ marginLeft: 'auto' }}>
                  {suggestion.severity}
                </span>
              )}
            </div>
            <div className="compliance-card-message">
              {suggestion.message}
            </div>
            {suggestion.recommendation && (
              <div className="compliance-card-recommendation">
                <strong>Recommendation:</strong> {suggestion.recommendation}
              </div>
            )}
            {suggestion.timestamp && (
              <div style={{
                marginTop: 'var(--spacing-2)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--color-neutral-500)'
              }}>
                {new Date(suggestion.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

