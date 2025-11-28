/** Professional loading spinner component */

export function LoadingSpinner({ size = 'md' }) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : size === 'lg' ? 'spinner-lg' : '';
  
  return (
    <div className={`spinner ${sizeClass}`} role="status" aria-label="Loading">
      <span className="sr-only">Loading...</span>
    </div>
  );
}

