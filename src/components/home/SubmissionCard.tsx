import React from 'react';

interface SubmissionCardProps {
  /** Submission ID */
  id: string;
  /** Class of Business */
  classOfBusiness: string;
  /** Line of Business (optional) */
  lineOfBusiness?: string;
  /** Submission status */
  status: string;
  /** Client name */
  client?: string;
  /** Year */
  year?: string;
  /** CTA button text */
  ctaText: string;
  /** Click handler for the action button */
  onAction: () => void;
  /** Whether this is a submitted (read-only) submission */
  isSubmitted?: boolean;
}

/**
 * SubmissionCard - Displays a single submission with enhanced visual contrast,
 * hover effects, and keyboard accessibility.
 * 
 * Features:
 * - Higher-contrast borders in dark mode
 * - Soft elevation with hover ring for clickability feedback
 * - Clear keyboard focus outline (a11y compliant)
 * - No layout shift on hover/focus
 * - Optional inner border for extra crispness on dark backgrounds
 */
export function SubmissionCard({
  id,
  classOfBusiness,
  lineOfBusiness,
  status,
  client = '—',
  year = '—',
  ctaText,
  onAction,
  isSubmitted = false,
}: SubmissionCardProps) {
  return (
    <div
      className="
        group relative rounded-xl 
        border border-gray-200 dark:border-white/12 
        bg-white dark:bg-white/[0.03]
        shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(0,0,0,0.5)]
        transition-all duration-200
        hover:border-gray-300 dark:hover:border-white/20 
        hover:bg-gray-50 dark:hover:bg-white/[0.05]
        hover:shadow-md dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.06),0_12px_32px_-12px_rgba(0,0,0,0.6)]
        focus-within:border-indigo-400 dark:focus-within:border-indigo-400/40 
        focus-within:ring-2 focus-within:ring-indigo-500/25 dark:focus-within:ring-indigo-400/25
      "
      data-submission-id={id}
    >
      {/* Optional inner border for extra crispness on very dark backgrounds */}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
      
      <div className="relative p-4">
        {/* Header: COB/LOB + Status Badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <div 
              className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100" 
              title={classOfBusiness}
            >
              {classOfBusiness}
            </div>
            {lineOfBusiness && (
              <div 
                className="truncate text-xs text-gray-500 dark:text-gray-400 mt-0.5" 
                title={lineOfBusiness}
              >
                {lineOfBusiness}
              </div>
            )}
          </div>
          <span 
            className={`
              ml-2 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap
              ${
                status === 'submitted' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                  : status === 'in_progress'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
              }
            `}
            aria-label={`Status: ${status}`}
          >
            {status}
          </span>
        </div>

        {/* Metadata: Client · Year */}
        <div 
          className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate" 
          title={`${client} · ${year}`}
        >
          {client} · {year}
        </div>

        {/* Action Button */}
        <button
          onClick={onAction}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium
            transition-all duration-200
            focus:outline-none
            focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:ring-offset-2 
            focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800
            ${
              isSubmitted
                ? 'bg-gray-100 text-gray-800 hover:bg-gray-200 dark:bg-gray-200/10 dark:text-gray-100 dark:hover:bg-gray-200/20'
                : 'bg-gray-900 text-white hover:bg-black dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
            }
          `}
          aria-label={`${ctaText} submission for ${classOfBusiness}`}
        >
          {isSubmitted && (
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
              />
            </svg>
          )}
          {ctaText}
        </button>
      </div>
    </div>
  );
}
