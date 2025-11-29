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
      className="btn btn-assist"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label="Request compliance assistance"
      style={{
        minWidth: '200px',
        position: 'relative',
        fontWeight: 'var(--font-weight-medium)'
      }}
    >
      {isLoading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>Analyzing...</span>
        </>
      ) : (
        <>
          <FiHelpCircle size={18} />
          <span>Get Compliance Guidance</span>
        </>
      )}
    </button>
  );
}

