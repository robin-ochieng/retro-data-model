import React from 'react';

type SubmissionStatus = 'in_progress' | 'in-progress' | 'submitted' | 'archived';

interface StatusBadgeProps {
  status: SubmissionStatus;
}

const statusConfig = {
  in_progress: { 
    label: 'In Progress', 
    className: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50' 
  },
  submitted: { 
    label: 'Submitted', 
    className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700/50' 
  },
  archived: { 
    label: 'Archived', 
    className: 'bg-gray-100 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700' 
  },
} as const;

export function StatusBadge({ status }: StatusBadgeProps) {
  // Normalize status variations
  const normalizedStatus = status === 'in-progress' ? 'in_progress' : status;
  
  const config = statusConfig[normalizedStatus as keyof typeof statusConfig] || statusConfig.in_progress;

  return (
    <span 
      className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      role="status"
      aria-label={`Submission status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
