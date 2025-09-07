import React, { useEffect, useMemo, useState } from 'react';
import HelpLayout from './help/HelpLayout';
import TOC, { TocItem } from './help/TOC';
import Callout from './help/Callout';
import FAQ, { QA } from './help/FAQ';
import pkg from '../../package.json';

function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | undefined>(undefined);
  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target) setActive((visible[0].target as HTMLElement).id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids.join('|')]);
  return active;
}

function AnchorHeading({ id, level = 2, children }: { id: string; level?: 2 | 3; children: React.ReactNode }) {
  const common = (
    <a href={`#${id}`} className="no-underline hover:underline inline-flex items-center gap-2">
      <span>{children}</span>
      <button
        type="button"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        aria-label={`Copy link to ${children}`}
        onClick={() => {
          try {
            navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#${id}`);
          } catch {}
        }}
      >
        #
      </button>
    </a>
  );
  if (level === 2) {
    return (
      <h2 id={id} className="text-2xl font-semibold mt-10 mb-3 scroll-mt-24 group">
        {common}
      </h2>
    );
  }
  return (
    <h3 id={id} className="text-lg font-medium mt-6 mb-2 scroll-mt-24 group">
      {common}
    </h3>
  );
}

export default function Help() {
  const lastUpdated = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const toc: TocItem[] = [
    { id: 'introduction', text: 'Introduction', level: 2 },
    { id: 'quick-start', text: 'Quick Start', level: 2 },
    { id: 'navigation', text: 'Navigation', level: 2 },
    { id: 'wizard', text: 'Working in the Wizard', level: 2 },
    { id: 'tips', text: 'Tips & Best Practices', level: 2 },
    { id: 'shortcuts', text: 'Keyboard Shortcuts', level: 2 },
    { id: 'troubleshooting', text: 'Troubleshooting', level: 2 },
    { id: 'faq', text: 'FAQ', level: 2 },
    { id: 'glossary', text: 'Glossary', level: 2 },
    { id: 'data-model', text: 'Data Model Links', level: 2 },
    { id: 'support', text: 'Support & Feedback', level: 2 },
  ];
  const activeId = useActiveHeading(toc.map((t) => t.id));

  const faqs: QA[] = [
    { q: 'I can\'t sign in. What should I do?', a: 'Verify your email and password, or use the reset option if available. If issues persist, contact your admin.' },
    { q: 'How does autosave work?', a: 'Edits are saved shortly after inactivity in small batches. Invalid fields are skipped until corrected.' },
    { q: 'What\'s different between Property and Casualty?', a: 'Each LoB has distinct tabs and fields; for instance, Property includes CRESTA and Climate Exposure while Casualty includes Motor Fleet and Rate Development.' },
    { q: 'Should I use CSV or XLSX?', a: 'Use paste from Excel/CSV into supported tables. Some tabs allow CSV export for verification; Casualty tabs may disable export by design.' },
  ];

  return (
    <HelpLayout>
      <div className="mx-auto max-w-6xl py-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-6">Help & User Guide</h1>

        <div className="grid md:grid-cols-[1fr,280px] gap-8">
          <article className="prose prose-slate dark:prose-invert max-w-none">
            <section id="introduction">
              <AnchorHeading id="introduction">Introduction</AnchorHeading>
              <p>
                Welcome to Retrocession Hub. This app streamlines the collection of client and treaty data across
                Property and Casualty lines of business using a guided wizard with autosave and resume.
              </p>
              <Callout variant="info">Autosave runs after brief inactivity and saves in small batches to improve reliability.</Callout>
            </section>

            <section id="quick-start">
              <AnchorHeading id="quick-start">Quick Start</AnchorHeading>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Use a modern browser (Edge, Chrome, or Firefox) and sign in.</li>
                <li>Create a new submission or resume one from the Home page.</li>
                <li>Select a Line of Business (Property or Casualty) to open its tabs.</li>
                <li>Complete Client Details (Header) first; its values flow to other tabs.</li>
                <li>Enter data in each tab. Changes autosave after brief inactivity.</li>
              </ol>
            </section>

            <section id="navigation">
              <AnchorHeading id="navigation">Navigation</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Top bar</strong>: Branding and quick actions.</li>
                <li><strong>Left navigation</strong>: Tabs by Line of Business (Property or Casualty).</li>
                <li><strong>Main workspace</strong>: Forms and tables with inline validation and autosave.</li>
              </ul>
            </section>

            <section id="wizard">
              <AnchorHeading id="wizard">Working in the Wizard</AnchorHeading>
              <AnchorHeading id="header" level={3}>Client Details (Header)</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>Country, Class of Business, and Lines: Use dropdowns; select "Other" to type a custom value.</li>
                <li>Currency (standard units): Choose the reporting currency; downstream tabs reference this.</li>
                <li>Treaty Type: Choose the appropriate structure (e.g., Proportional, Non‑Proportional).</li>
                <li>Claims Period: Enter a date range (Start and End). End must be on or after Start.</li>
              </ul>
              <p>
                Header values (Treaty Type, Currency, Claims Period) are saved to your submission and made available to downstream tabs.
                Where applicable, some fields appear read‑only in tables to keep entries consistent.
              </p>

              <AnchorHeading id="lob-tabs" level={3}>Tabs by Line of Business</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  <strong>Property</strong>: EPI Summary; Treaty Statistics (Prop/Non‑Prop); UW Limit; Risk Profile; Large Loss
                  (List & Triangulations); Climate Exposure; CRESTA controls.
                </li>
                <li>
                  <strong>Casualty</strong>: Treaty Statistics (Prop/PropCC/Non‑Prop); Rate & Risks Development; Large Loss
                  (List & Triangulations); Motor Fleet List.
                </li>
              </ul>

              <AnchorHeading id="paste" level={3}>Paste from Excel/CSV</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use the Paste button where available to paste rows copied from Excel/CSV.</li>
                <li>Data is validated inline and saved in small batches to improve reliability.</li>
                <li>Some Property tabs provide CSV export; Casualty tabs disable CSV export by design.</li>
              </ul>

              <AnchorHeading id="saving" level={3}>Saving & Submit</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>Autosave runs shortly after you stop typing or editing.</li>
                <li>Invalid inputs won’t save; fix the highlighted field and try again.</li>
                <li>Use the Submit tab when you’re done. If exports are enabled, a file link will be provided.</li>
              </ul>
            </section>

            <section id="tips">
              <AnchorHeading id="tips">Tips & Best Practices</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>Use a modern browser and keep one tab open during entry.</li>
                <li>Prefer dropdown values for consistency; use "Other" only when necessary.</li>
                <li>Use the date range controls for Claims Period to avoid format errors.</li>
                <li>For large pastes, try smaller batches to isolate validation issues.</li>
                <li>If a read‑only field looks wrong, update it in the Header instead of per‑row.</li>
              </ul>
            </section>

            <section id="shortcuts">
              <AnchorHeading id="shortcuts">Keyboard Shortcuts</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>Navigate wizard tabs: Alt/Option + Up/Down (if enabled).</li>
                <li>Open Paste modal: Alt/Option + V (on supported tabs).</li>
                <li>Save: Autosave runs automatically; manual save is not required.</li>
                <li>Submit: Go to Submit tab and follow prompts.</li>
              </ul>
            </section>

            <section id="troubleshooting">
              <AnchorHeading id="troubleshooting">Troubleshooting</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li>Cannot log in: Check credentials or SSO access; contact an admin if needed.</li>
                <li>Changes aren’t saving: Check your network; wait a moment and edit again.</li>
                <li>Missing tab: Confirm the correct Line of Business is selected.</li>
                <li>Empty Lines of Business: Select a Class of Business first.</li>
                <li>Invalid date range: Ensure Claims Period End is on/after Start.</li>
                <li>Paste failing: Ensure column order/format matches the table; reduce batch size.</li>
              </ul>
            </section>

            <section id="faq">
              <AnchorHeading id="faq">FAQ</AnchorHeading>
              <FAQ items={faqs} />
            </section>

            <section id="glossary">
              <AnchorHeading id="glossary">Glossary (Quick Definitions)</AnchorHeading>
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
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

            <section id="data-model">
              <AnchorHeading id="data-model">Data Model Links</AnchorHeading>
              <ul className="list-disc pl-6 space-y-1">
                <li><a className="hover:underline" href="/docs/database/overview.md">Database Overview</a></li>
                <li><a className="hover:underline" href="/docs/database/glossary.md">Glossary</a></li>
                <li><a className="hover:underline" href="/docs/database/tables/epi_summary.md">EPI Summary</a></li>
                <li><a className="hover:underline" href="/docs/database/tables/sheet_blobs.md">Sheet Blobs</a></li>
                <li><a className="hover:underline" href="/docs/FEATURES.md">Features</a></li>
              </ul>
            </section>

            <section id="support">
              <AnchorHeading id="support">Support & Feedback</AnchorHeading>
              <p className="text-muted-foreground">Questions or suggestions? Email <a className="hover:underline" href="mailto:support@example.com">support@example.com</a>.</p>
            </section>

            <div className="mt-10">
              <a href="#main" className="text-sm text-muted-foreground hover:underline">Back to top</a>
            </div>
          </article>

          <aside className="hidden md:block">
            <TOC items={toc} activeId={activeId} />
            <div className="mt-6 text-xs text-muted-foreground">
              Last updated • v{pkg.version} • {lastUpdated}
            </div>
          </aside>
        </div>
      </div>
    </HelpLayout>
  );
}
