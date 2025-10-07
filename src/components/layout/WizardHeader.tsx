import React from 'react';
import Logo from '../Logo';
import ThemeToggle from '../ThemeToggle';
import { StatusBadge } from './StatusBadge';
import { CopyableId } from './CopyableId';
import { Pill } from './Pill';
import { ChevronRight } from 'lucide-react';

interface WizardHeaderProps {
  submissionId: string;
  status?: string;
  classOfBusiness?: string;
  lineOfBusiness?: string;
  lobDisplayName?: string;
  userEmail?: string;
  userFullName?: string;
  onSignOut: () => void;
}

export function WizardHeader({
  submissionId,
  status = 'in_progress',
  classOfBusiness,
  lineOfBusiness,
  lobDisplayName,
  userEmail = '',
  userFullName,
  onSignOut,
}: WizardHeaderProps) {
  const displayName = userFullName || userEmail;
  const firstName = displayName?.split(/\s+/)[0] || displayName?.split('@')[0] || '';

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
      {/* Primary row */}
      <div className="h-14 px-4">
        <div className="max-w-7xl mx-auto h-full flex items-center gap-3">
          {/* Left cluster: logo + breadcrumb */}
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <div className="hidden sm:flex min-w-0 items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-gray-100">Retrocession Hub</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="truncate max-w-[150px]" title={classOfBusiness || '—'}>
                {classOfBusiness || '—'}
              </span>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1 min-w-4" />

          {/* Right cluster: status, id, help, theme, user, sign out */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status as any} />
            <CopyableId id={submissionId} />
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-600 hidden md:block" aria-hidden="true" />
            
            <a 
              href="/help" 
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline hidden md:inline-block"
            >
              Help
            </a>
            
            <ThemeToggle />
            
            <span 
              className="text-xs text-gray-700 dark:text-gray-300 hidden lg:inline-block max-w-[150px] truncate" 
              title={displayName}
            >
              <span className="sm:hidden">{firstName}</span>
              <span className="hidden sm:inline">{displayName}</span>
            </span>
            
            <button
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
              onClick={onSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Secondary row - Desktop only */}
      <div className="hidden lg:block border-t border-gray-200 dark:border-gray-700">
        <div className="h-10 px-4">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-3">
            {/* Left: contextual pills */}
            <div className="flex flex-wrap items-center gap-2">
              {classOfBusiness && (
                <Pill icon="layers" title="Class of Business">
                  {classOfBusiness}
                </Pill>
              )}
              {lineOfBusiness && (
                <Pill icon="briefcase" title="Line of Business">
                  {lineOfBusiness}
                </Pill>
              )}
              {lobDisplayName && !classOfBusiness && (
                <Pill title="Line of Business">
                  {lobDisplayName}
                </Pill>
              )}
            </div>

            {/* Right: actions slot (future use for Submit, Download, etc.) */}
            <div className="flex items-center gap-2">
              {/* Reserved for future actions */}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile summary - Below lg breakpoint */}
      <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          {classOfBusiness && lineOfBusiness ? (
            <span className="truncate">
              {classOfBusiness} • {lineOfBusiness}
            </span>
          ) : classOfBusiness ? (
            <span className="truncate">{classOfBusiness}</span>
          ) : lobDisplayName ? (
            <span className="truncate">{lobDisplayName}</span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
