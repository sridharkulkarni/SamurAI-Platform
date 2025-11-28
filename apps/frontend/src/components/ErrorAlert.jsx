/** Professional error alert component */

import { useState } from 'react';
import { FiAlertCircle, FiX } from 'react-icons/fi';

export function ErrorAlert({ message, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div className="error-alert" role="alert">
      <FiAlertCircle className="error-alert-icon" size={20} />
      <div className="error-alert-content">{message}</div>
      {onDismiss && (
        <button
          className="error-alert-close"
          onClick={handleDismiss}
          aria-label="Dismiss error"
        >
          <FiX size={18} />
        </button>
      )}
    </div>
  );
}

