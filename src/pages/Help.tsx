import React from 'react';
import Logo from '../components/Logo';

export default function Help() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 flex flex-col">
      {/* Header (navbar) */}
      <header className="w-full sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-gray-900/60 bg-white dark:bg-gray-900 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <a href="/" className="text-sm text-blue-700 dark:text-blue-400 hover:underline">Home</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto w-full px-4 py-8 flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-white">Help & User Guide</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Introduction</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Welcome to Retrocession Hub. This app streamlines the collection of client and treaty data across
            Property and Casualty lines of business using a guided wizard with autosave and resume.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Quick Start</h2>
          <ol className="list-decimal pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Use a modern browser (Edge, Chrome, or Firefox) and sign in.</li>
            <li>Create a new submission or resume one from the Home page.</li>
            <li>Select a Line of Business (Property or Casualty) to open its tabs.</li>
            <li>Complete Client Details (Header) first; its values flow to other tabs.</li>
            <li>Enter data in each tab. Changes autosave after brief inactivity.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Navigation Guide</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li><strong>Top bar</strong>: Branding and quick actions.</li>
            <li><strong>Left navigation</strong>: Tabs by Line of Business (Property or Casualty).</li>
            <li><strong>Main workspace</strong>: Forms and tables with inline validation and autosave.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Working in the Wizard</h2>
          <h3 className="font-medium mb-1">Client Details (Header)</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Country, Class of Business, and Lines: Use dropdowns; select "Other" to type a custom value.</li>
            <li>Currency (standard units): Choose the reporting currency; downstream tabs reference this.</li>
            <li>Treaty Type: Choose the appropriate structure (e.g., Proportional, Non‑Proportional).</li>
            <li>Claims Period: Enter a date range (Start and End). End must be on or after Start.</li>
          </ul>
          <p className="text-gray-700 dark:text-gray-300 mt-2">
            Header values (Treaty Type, Currency, Claims Period) are saved to your submission and made available to
            downstream tabs. Where applicable, some fields appear read‑only in tables to keep entries consistent.
          </p>

          <h3 className="font-medium mt-4 mb-1">Tabs by Line of Business</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Property</strong>: EPI Summary; Treaty Statistics (Prop/Non‑Prop); UW Limit; Risk Profile;
              Large Loss (List & Triangulations); Climate Exposure; CRESTA controls.
            </li>
            <li>
              <strong>Casualty</strong>: Treaty Statistics (Prop/PropCC/Non‑Prop); Rate & Risks Development; Large Loss
              (List & Triangulations); Motor Fleet List.
            </li>
          </ul>

          <h3 className="font-medium mt-4 mb-1">Paste from Excel/CSV</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Use the Paste button where available to paste rows copied from Excel/CSV.</li>
            <li>Data is validated inline and saved in small batches to improve reliability.</li>
            <li>Some Property tabs provide CSV export; Casualty tabs disable CSV export by design.</li>
          </ul>

          <h3 className="font-medium mt-4 mb-1">Saving & Submit</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Autosave runs shortly after you stop typing or editing.</li>
            <li>Invalid inputs won’t save; fix the highlighted field and try again.</li>
            <li>Use the Submit tab when you’re done. If exports are enabled for your environment, a file link will be provided.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Tips & Best Practices</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Use a modern browser and keep one tab open during entry.</li>
            <li>Prefer dropdown values for consistency; use "Other" only when necessary.</li>
            <li>Use the date range controls for Claims Period to avoid format errors.</li>
            <li>For large pastes, try smaller batches to isolate validation issues.</li>
            <li>If a read‑only field looks wrong, update it in the Header instead of per‑row.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Cannot log in: Check credentials or SSO access; contact an admin if needed.</li>
            <li>Changes aren’t saving: Check your network; wait a moment and edit again.</li>
            <li>Missing tab: Confirm the correct Line of Business is selected.</li>
            <li>Empty Lines of Business: Select a Class of Business first.</li>
            <li>Invalid date range: Ensure Claims Period End is on/after Start.</li>
            <li>Paste failing: Ensure column order/format matches the table; reduce batch size.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Glossary (Quick Definitions)</h2>
          <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-gray-700 dark:text-gray-300">
            <div>
              <dt className="font-medium">Submission</dt>
              <dd>Your working package of client/treaty data across tabs for a given opportunity.</dd>
            </div>
            <div>
              <dt className="font-medium">Line of Business (LoB)</dt>
              <dd>A business grouping such as Property or Casualty; each has its own set of tabs.</dd>
            </div>
            <div>
              <dt className="font-medium">Treaty Type</dt>
              <dd>Contract structure: Proportional (e.g., Quota Share, Surplus) or Non‑Proportional (e.g., XL, Cat XL).</dd>
            </div>
            <div>
              <dt className="font-medium">Estimated Premium Income (EPI)</dt>
              <dd>Projected premium for the treaty during the Claims Period; used in EPI Summary.</dd>
            </div>
            <div>
              <dt className="font-medium">Gross Written Premium (GWP)</dt>
              <dd>Total premium written before deductions; may be split by segment or layer.</dd>
            </div>
            <div>
              <dt className="font-medium">Claims Period</dt>
              <dd>Start and End dates for claims evaluation; End must be on or after Start.</dd>
            </div>
            <div>
              <dt className="font-medium">Origin/Accident Year</dt>
              <dd>The year in which losses occur; used as the row axis in triangulations.</dd>
            </div>
            <div>
              <dt className="font-medium">Development Month (Dev)</dt>
              <dd>Elapsed months since origin; columns in triangulations typically step by 12.</dd>
            </div>
            <div>
              <dt className="font-medium">Large Loss</dt>
              <dd>High‑severity claim tracked individually (with date, cause, incurred/paid values).</dd>
            </div>
            <div>
              <dt className="font-medium">CRESTA Zone</dt>
              <dd>Standardized geographic zones for catastrophe exposure aggregation and pricing.</dd>
            </div>
            <div>
              <dt className="font-medium">Triangulation</dt>
              <dd>A table of loss or premium values by origin year vs. development period.</dd>
            </div>
            <div>
              <dt className="font-medium">Currency (standard units)</dt>
              <dd>The reporting currency applied consistently across tabs (e.g., USD).</dd>
            </div>
          </dl>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full mt-auto border-t bg-white/70 dark:bg-gray-900/60 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <span>© {new Date().getFullYear()} Kenbright Re</span>
          <span className="inline-flex items-center gap-1">
            <span className="opacity-80">Powered by</span>
            <strong className="font-semibold">Kenbright AI</strong>
          </span>
        </div>
      </footer>
    </div>
  );
}
