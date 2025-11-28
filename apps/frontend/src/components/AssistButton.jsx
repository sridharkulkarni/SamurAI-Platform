/** Professional assist button component */

import { useState } from 'react';
import { FiHelpCircle } from 'react-icons/fi';
import { LoadingSpinner } from './LoadingSpinner';

export function AssistButton({ 
  onClick, 
  disabled = false,
  isLoading = false 
}) {
  return (
    <button
      className="btn btn-primary"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label="Request compliance assistance"
      style={{
        minWidth: '160px',
        position: 'relative'
      }}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>Checking...</span>
        </>
      ) : (
        <>
          <FiHelpCircle size={18} />
          <span>Assist</span>
        </>
      )}
    </button>
  );
}

