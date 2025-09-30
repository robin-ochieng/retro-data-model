import React from 'react';

export const Spinner: React.FC<{ size?: number; stroke?: number; className?: string; label?: string }> = ({ size = 28, stroke = 4, className = '', label }) => (
  <div className={`flex items-center gap-2 ${className}`} role="status" aria-live="polite">
    <svg
      className="spinner-svg"
      width={size}
      height={size}
      viewBox="0 0 50 50"
      aria-hidden="true"
    >
      <circle
        className="spinner-circle text-blue-500 dark:text-blue-400"
        cx="25"
        cy="25"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
      />
    </svg>
    {label && <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>}
  </div>
);

export const DotsLoader: React.FC<{ className?: string; label?: string; size?: number }> = ({ className = '', label, size = 8 }) => (
  <div className={`flex items-center gap-2 ${className}`} role="status" aria-live="polite">
    {label && <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{label}</span>}
    <div className="dot-pulse flex items-center gap-1">
      <span style={{ width: size, height: size }} className="rounded-full bg-blue-500 dark:bg-blue-400" />
      <span style={{ width: size, height: size }} className="rounded-full bg-blue-500 dark:bg-blue-400" />
      <span style={{ width: size, height: size }} className="rounded-full bg-blue-500 dark:bg-blue-400" />
    </div>
  </div>
);

export const Skeleton: React.FC<{ className?: string; lines?: number; lineHeight?: number }> = ({ className = '', lines = 3, lineHeight = 14 }) => (
  <div className={`space-y-2 ${className}`}> {
    Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="loader-shimmer"
        style={{ height: lineHeight, width: '100%', borderRadius: 4 }}
      />
    )) }
  </div>
);

export const LoadingOverlay: React.FC<{ show: boolean; label?: string; children?: React.ReactNode }> = ({ show, label = 'Loading', children }) => (
  <div className="relative">
    {children}
    {show && (
      <div className="absolute inset-0 backdrop-blur-sm bg-white/50 dark:bg-gray-900/50 flex flex-col items-center justify-center gap-4 animate-[fadeIn_.2s_ease]">
        <Spinner label={label} />
      </div>
    )}
  </div>
);

export const Loader: React.FC<{ variant?: 'spinner' | 'dots'; label?: string; className?: string }> = ({ variant = 'spinner', label, className }) => {
  if (variant === 'dots') return <DotsLoader label={label} className={className} />;
  return <Spinner label={label} className={className} />;
};

export default Loader;
