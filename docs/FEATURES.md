# Features

- Branding and navigation
	- Renamed the “Header” tab to “Client Details” for both Property and Casualty.
	- Updated the site title to “Retrocession Hub”.

- Client Details (data capture)
	- Country dropdown with African countries; default to Kenya; “Other” free‑text fallback.
	- Currency (std. units) dropdown using ISO 4217 codes; default to USD; “Other” free‑text fallback.
	- Class of Business dropdown with dependent Line(s) of Business; “Other” free‑text fallback; line options auto‑reset on class change.
	- Treaty Type dropdown with common treaty taxonomies; “Other” free‑text fallback.
	- Claims Period now uses a date range (Start / End) picker with validation (End must be on/after Start). Legacy single‑string values are parsed and migrated on load.
	- Inline validation with descriptive error surfacing.
	- Header autosaves to sheet_blobs('Header') and mirrors key fields (treaty_type, currency_std_units, claims_period_start/end) to submissions.meta for downstream consumers.

- Submission meta & propagation
	- Centralized, type‑safe SubmissionMeta context (provider + hook) backed by Supabase.
	- On mount, loads submissions.meta and sheet_blobs('Header'), deriving:
		- treatyType: from Header payload or submissions.meta
		- currencyStdUnits: from Header payload or submissions.meta
	- Exposes: meta, treatyType, currencyStdUnits, lastSavedAt, updateMeta(patch), refresh().
	- updateMeta merges into submissions.meta and, when patch includes treaty_type or currency_std_units, also syncs sheet_blobs('Header').
	- Wizard is wrapped with SubmissionMetaProvider so all steps can read current treaty/currency and react to live edits.

- Workflows
	- Property (tab order)
		- Client Details, EPI Summary, Treaty Statistics (Prop), Treaty Statistics (Non‑Prop), Top 20 Risks, Climate change exposure, UW Limit, Risk Profile, Large Loss List, Large Loss Triangulation, Cat Loss List, Triangulation, Cresta Zone Control, Submit.
	- Casualty (tab order)
		- Client Details, EPI Summary, Treaty Statistics (Prop), Treaty Statistics (PropCC), Treaty Statistics (Non‑Prop), Rate Development, Rate Development (Motor Specific), Max UW Limit Development, Number of Risks Development, Risk Profile, Top 20 Risks, Motor Fleet List, Large Loss List, Large Loss Triangulation, Aggregate Triangulation, CAT Loss Triangulation, Cresta Zone Control, Submit.

- Data persistence and autosave
	- Supabase‑backed persistence to sheet_blobs per step (uses resilient update‑then‑insert where needed).
	- Transparent autosave across wizard steps with debounced saves and a “Saved hh:mm:ss” indicator per tab.
	- Array‑backed tables follow a consistent pattern on save: delete by submission_id then bulk insert current rows (chunking supported).
	- Bulk ingestion via Paste from Excel (TSV/CSV) with header detection, tolerant numeric parsing (thousand separators allowed), column validation, and chunked saves for large payloads.
	- Excel export scaffolding for downstream reporting.
	- Excel templates available under Resources for standardized inputs.
	- Resilient upsert: if the database lacks the composite unique/primary key on sheet_blobs, the app falls back to update‑then‑insert to ensure autosave never blocks.

- Security and routing
	- Authentication via Supabase session; gated access with ProtectedRoute.
	- Deep‑linkable routes per tab with state continuity across steps.

- UI/UX
	- Responsive, accessible UI with Tailwind CSS and consistent form patterns.
	- Paste Modal and "Paste from Excel" actions across key tables for high‑volume data entry.
		- EPI Summary: Premium Summary (EPI) and GWP Split tables support direct paste from Excel. Currency removed entirely for this tab (no currency stored).
		- Property: Treaty Statistics (Prop), Treaty Statistics (Non‑Prop), Large Loss List, Cat Loss List, UW Limit, Risk Profile, and Cresta Zone Control support paste from Excel.
		- Casualty: Treaty Statistics (Prop, PropCC, Non‑Prop), Rate Development (incl. Motor), Max UW Limit Development, Number of Risks Development, Large Loss List, Large Loss Triangulation, Aggregate Triangulation, CAT Loss Triangulation, and Motor Fleet List support paste from Excel.
		- Robust parser with header detection and flexible mapping: prefers tab‑delimited Excel ranges, supports quoted CSV, trims cells, never splits numbers on commas (e.g., "1,200.00" remains one value). Numeric fields strip thousands separators; text fields preserve formatting.
		- Casualty tabs: Import/Export CSV removed (paste‑only UX retained). Top 20 Risks hides Export in Casualty and enforces exactly 20 rows.
		- Label consistency: "Year" headers normalized to "UW Year" on Casualty Treaty Statistics (Prop, PropCC).
		- Motor Specific: standardized "Paste from Excel" button styling.

- EPI Summary specifics
	- Default Treaty Type set on Client Details to “Quota Share Treaty”; propagated read‑only to EPI Summary rows and kept in sync on changes.
	- Currency removed from EPI Summary; no currency field is saved or synced on this tab.
	- Persistence: rows saved to table `epi_summary`; GWP Split and Additional Comments saved under `sheet_blobs` (sheet_name: "EPI Summary") using update‑then‑insert so autosave never blocks or duplicates.
	- Autosave flushes on tab switch to capture last‑second edits reliably.

- Large Loss Triangulation (Property)
	- UI mirrors Casualty: header list (per‑loss metadata) plus a multi‑row development grid with measure selector (Paid / Reserved / Incurred).
	- Dynamic development columns (12‑month increments) with per‑column totals.
	- Paste from Excel supported for both header rows and multi‑row grid.
	- Persistence model:
		- Core values saved to table `large_loss_triangle_values` by (loss_identifier, measure, dev_months).
		- Extra header fields (date_of_loss, claim_no) saved to `sheet_blobs` under "Large Loss Triangulation (Property)".

- Cresta Zone Control (Property)
	- Five tables:
		- Sum Insured (new, placed above Personal Lines): Zone Description + Gross/Net with totals.
		- Personal Lines, Commercial Lines, Industrial, Engineering: each with category pairs (Gross/Net) per zone, plus totals.
	- Paste from Excel on all five tables with header detection and tolerant numeric parsing.
	- Autosaves the entire payload in `sheet_blobs` under "Cresta Zone Control (Property)".

- Developer experience
	- Vite + HMR development workflow; npm tasks for dev/build.
	- Config‑driven, per‑LoB tab registry for extensibility.
	- Automated documentation generation on pre‑commit.
	- Git hygiene: ignore Excel lock/temp files to avoid accidental commits.

- Database resiliency & indexes
	- Migration enforces (or promotes) a composite primary key on sheet_blobs (submission_id, sheet_name) to enable ON CONFLICT upserts reliably.
	- Functional JSONB indexes added for Header sheet on payload->>'claims_period_start' and payload->>'claims_period_end' to accelerate date‑range queries.
