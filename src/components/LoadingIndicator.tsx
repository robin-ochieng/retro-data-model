import React from 'react';

// Simple animated spinner + dots using Tailwind utilities
export const LoadingIndicator: React.FC<{ label?: string; small?: boolean }> = ({ label = 'Loading', small }) => {
  return (
    <div className="flex items-center gap-2" role="status" aria-live="polite">
      <span
        className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${small ? 'h-4 w-4' : 'h-5 w-5'}`}
      />
      <span className="flex items-center gap-1 font-medium text-sm">
        {label}
        <span className="flex gap-0.5">
          <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:-0.2s]" />
          <span className="h-1 w-1 rounded-full bg-current animate-bounce [animation-delay:-0.1s]" />
          <span className="h-1 w-1 rounded-full bg-current animate-bounce" />
        </span>
      </span>
    </div>
  );
};

export default LoadingIndicator;
