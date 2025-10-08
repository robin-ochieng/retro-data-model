import React from 'react';
import { CheckCircle2, Settings2, PlayCircle, BookOpen, Shield } from 'lucide-react';

export function GettingStarted() {
  return (
    <section
      aria-label="Getting started guide"
      className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-white/[0.04] dark:to-white/[0.02] p-6 shadow-lg dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
    >
      {/* Enhanced gradient border effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gradient-to-br from-indigo-500/30 via-purple-500/20 to-blue-500/30 dark:from-indigo-400/20 dark:via-purple-400/10 dark:to-blue-400/20" />
      
      {/* Glow effect on top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent dark:via-indigo-400/30" />

      {/* Header */}
      <header className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Getting started
        </h2>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
          Create, autosave, and pick up where you left off—no spreadsheets required.
        </p>
      </header>

      {/* Steps */}
      <ol className="space-y-4" role="list">
        <li className="flex gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Pick a client &amp; year
            </div>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              Use the form on the left to create a new submission.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <Settings2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              (Optional) Choose a preset class
            </div>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              This only pre-fills the wizard—you can change it anytime.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <PlayCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Start &amp; complete the wizard
            </div>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
              Your changes autosave live. Resume from the list below.
            </p>
          </div>
        </li>
      </ol>

      {/* Key Features */}
      <div className="mt-6 space-y-3">
        <div className="flex items-start gap-3 rounded-lg border border-gray-200/80 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50/30 dark:from-white/[0.02] dark:to-transparent p-3.5">
          <Shield className="h-5 w-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Secure & Automatic Saving
            </div>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              All changes are automatically saved and protected by row-level security.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3 rounded-lg border border-gray-200/80 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50/30 dark:from-white/[0.02] dark:to-transparent p-3.5">
          <BookOpen className="h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Need Help?
            </div>
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
              Visit our <a href="/help" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Help Center</a> for detailed guidance and FAQs.
            </p>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <p className="mt-5 text-xs text-gray-500 dark:text-gray-500">
        Autosave is on • Read-only once submitted • Data protected by RLS
      </p>
    </section>
  );
}
