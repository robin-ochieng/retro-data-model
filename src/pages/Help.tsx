import React from 'react';

export default function Help() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950">
      <main className="max-w-4xl mx-auto w-full px-4 py-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-6 text-gray-900 dark:text-white">Help & User Guide</h1>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Introduction</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Welcome to Retrocession Hub. This application streamlines collection of client and treaty data across
            Property and Casualty lines of business through a guided, autosaving wizard.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Getting Started</h2>
          <ol className="list-decimal pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Open the app URL in a modern browser (Chrome, Edge, or Firefox).</li>
            <li>Sign in with your email and password. If access is restricted, contact your administrator.</li>
            <li>From Home, create a new submission or resume an existing one. Your work autosaves as you proceed.</li>
          </ol>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Navigation Guide</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li><strong>Top bar</strong>: Branding and quick actions.</li>
            <li><strong>Left navigation</strong>: Tabs by Line of Business (Property or Casualty).</li>
            <li><strong>Main workspace</strong>: Forms/tables with inline validation and autosave status.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Using Core Features</h2>
          <h3 className="font-medium mb-1">Client Details</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Country: Dropdown of African countries (default Kenya) with an "Other" free‑text fallback.</li>
            <li>Currency (in std. units): ISO 4217 dropdown (default USD) with an "Other" fallback.</li>
            <li>Class of Business & Line(s): Dependent dropdowns; choose "Other" to type a custom value.</li>
            <li>Treaty Type: Common treaty types with an "Other" option.</li>
          </ul>
          <h3 className="font-medium mt-4 mb-1">Data Tabs (examples)</h3>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Property: EPI Summary; Treaty Statistics (Prop/Non‑Prop); UW Limit; Risk Profile; Large Loss workflows; Climate Exposure.</li>
            <li>Casualty: Treaty Statistics (Prop/PropCC/Non‑Prop); Rate & Risks development; Large Loss & Triangulations; Motor Fleet List.</li>
          </ul>
          <h3 className="font-medium mt-4 mb-1">Paste from Excel/CSV</h3>
          <p className="text-gray-700 dark:text-gray-300">Use the Paste modal to paste rows from Excel/CSV. Data is parsed client‑side and saved in chunks.</p>
          <h3 className="font-medium mt-4 mb-1">Autosave and Submit</h3>
          <p className="text-gray-700 dark:text-gray-300">Autosave runs as you edit. Use the Submit tab when finished (if enabled for your workflow).</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Tips & Best Practices</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Use a modern browser and keep one tab open during entry.</li>
            <li>Prefer dropdown values for consistency; use "Other" only when necessary.</li>
            <li>Use date pickers to avoid format errors.</li>
            <li>For large pastes, try smaller batches to isolate validation issues.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Cannot log in: Check credentials or SSO access; contact an admin if needed.</li>
            <li>Changes aren’t saving: Check your network; wait and try editing again.</li>
            <li>Missing tab: Confirm the correct Line of Business is selected.</li>
            <li>Empty Lines of Business: Select a Class of Business first.</li>
            <li>Paste failing: Ensure column order/format; reduce batch size.</li>
          </ul>
        </section>

      </main>
    </div>
  );
}
