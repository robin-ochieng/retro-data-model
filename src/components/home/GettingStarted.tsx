import React from 'react';
import { BookOpen } from 'lucide-react';

export function GettingStarted() {
  return (
    <section
      aria-label="Getting started guide"
      className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-white/[0.04] dark:to-white/[0.02] p-7 shadow-lg dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)]"
    >
      {/* Enhanced gradient border effect */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gradient-to-br from-indigo-500/30 via-purple-500/20 to-blue-500/30 dark:from-indigo-400/20 dark:via-purple-400/10 dark:to-blue-400/20" />
      
      {/* Glow effect on top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent dark:via-indigo-400/30" />

      {/* Header */}
      <header className="mb-8">
        <h3 className="text-[1.0625rem] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Getting started
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Create, autosave, and pick up where you left off.
        </p>
      </header>

      {/* Steps */}
      <ol className="space-y-6" role="list">
        <li className="flex gap-4">
          <div 
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300"
            aria-hidden="true"
          >
            1
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Pick a Country, Reinsurer &amp; year
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Use the form on the left to create a new submission. Start by selecting the country, then pick the reinsurer in the respective country, select the year, and choose a preset class.
            </p>
          </div>
        </li>
        <li className="flex gap-4">
          <div 
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300"
            aria-hidden="true"
          >
            2
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              (Optional) Choose a preset class
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              This only pre-fills the wizard—you can change it anytime.
            </p>
          </div>
        </li>
        <li className="flex gap-4">
          <div 
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300"
            aria-hidden="true"
          >
            3
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Start &amp; complete the wizard
            </div>
            <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Your changes autosave live. Resume from the list below.
            </p>
          </div>
        </li>
      </ol>

      {/* Need Help Section */}
      <div className="mt-8">
        <div className="flex items-start gap-4 rounded-lg border border-gray-200/80 dark:border-white/[0.08] bg-gradient-to-br from-white to-gray-50/30 dark:from-white/[0.02] dark:to-transparent p-5">
          <BookOpen className="h-5 w-5 flex-shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Need Help?
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Visit our <a href="/help" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded">Help Center</a> for detailed guidance and FAQs.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
