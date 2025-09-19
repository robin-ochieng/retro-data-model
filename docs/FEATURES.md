# Features

- Branding and navigation
	- Renamed the “Header” tab to “Client Details” for both Property and Casualty.
	- Updated the site title to “Retrocession Hub”.
	- Help shown in header only after sign-in (Home, Wizard). On Login, Help appears in the card footer.
	- Theme‑aware logo assets: light and dark variants selected automatically.
	- Wizard tabs include compact Lucide icons for clear wayfinding across both LoBs.

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
	- Help Center page with structured content and in‑page navigation:
		- Sticky right‑rail Table of Contents (md+), anchors with copy‑link, callouts, FAQ, and links to data model docs (overview, glossary, epi_summary, sheet_blobs) and features list.
		- Theming via tokens; accessible landmarks (header/main/nav/footer), skip link, focus rings, and aria‑current for active TOC.
	- Polished Login/Sign‑up UI:
		- Header (logo left, compact Theme button right), softened divider; footer with Privacy/Terms.
		- Centered card (rounded, ring, shadow, bg‑card), theme‑aware logo sizing, clear title/subtitle.
		- Form improvements: labeled inputs with aria hints, password show/hide toggle, inline errors, aria‑live error banner, and loading spinner.

- Theming
	- Light/Dark/System modes powered by Tailwind CSS variables (HSL tokens) defined in `src/index.css` and mapped in `tailwind.config.js`.
	- Respects system preference via `prefers-color-scheme`; in System mode, changes to the OS theme reflect immediately.
	- Persists per user to `profiles.theme` in Supabase; falls back to `localStorage` when signed out.
	- Accessible dropdown for selecting theme (Light/Dark/System), keyboard/ARIA complete, used in app headers (Login, Home, Wizard).
	- Implementation: `src/theme/ThemeProvider.tsx` (applies `html.dark` and `data-theme`), `src/components/ThemeToggle.tsx`.
	- Recommended utility classes: `bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`.

- EPI Summary specifics
	- Default Treaty Type set on Client Details to “Quota Share Treaty”; propagated read‑only to EPI Summary rows and kept in sync on changes.
	- Currency removed from EPI Summary; no currency field is saved or synced on this tab.
	- Persistence: rows saved to table `epi_summary`; GWP Split and Additional Comments saved under `sheet_blobs` (sheet_name: "EPI Summary") using update‑then‑insert so autosave never blocks or duplicates.
	- Autosave flushes on tab switch to capture last‑second edits reliably.

- Large Loss Triangulation (Property) – Migrated (2025-09-15)
	- UI: header list (per‑loss metadata) plus three stacked development grids: Paid, Reserved, and Incurred (auto‑calculated as Paid + Reserved). Users edit Paid/Reserved; Incurred is computed and persisted for reporting.
	- Dynamic development columns (12‑month increments) with per‑column totals; “Add 12m” control on Paid/Reserved.
	- Paste from Excel supported for header rows and for Paid/Reserved grids; Incurred paste blocked with guidance.
	- Persistence model (relational):
		- Header saved to `large_loss_triangle_header_prop` with new fields `date_of_loss` (date) and `claim_policy_no` (text), plus `uw_or_acc_year`, `loss_description`, `threshold`, `claim_status`. Unique per `(submission_id, loss_identifier)`.
		- Development values split into `large_loss_triangle_paid_prop`, `large_loss_triangle_reserved_prop`, and `large_loss_triangle_incurred_prop` with composite unique `(submission_id, loss_identifier, development_months)` and owner‑only RLS.
	- Autosave: replaces header rows and each grid table (delete + bulk insert, chunked). Incurred recalculated on save to guarantee consistency.
	- Tests: verifies header persistence (including `date_of_loss`, `claim_policy_no`), Paid/Reserved save, Incurred auto‑calc and reload.

- Cat Loss List (Property) – Migrated (2025-09-15)
	- UI: DOL is a plain text input to optimize Excel paste (accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY). Values are normalized to ISO on save when recognizable; otherwise stored as given.
	- Persistence model (relational): rows saved to `cat_loss_list_prop` with columns (uw_year, name, dol, type_of_loss, gross_sum_insured, gross_incurred, paid_to_date, gross_outstanding, fac_amount, net_of_fac, surplus_cession, qs_cession, net_of_proportional, xol_payment, currency). Additional Comments stored in `cat_loss_list_meta_prop`.
	- Autosave: delete‑then‑insert for rows; meta saved via update‑then‑insert pattern.
	- Migration: `20250915_006_cat_loss_list_prop.sql` (tables, index on submission_id, owner‑only RLS policies).

 - Cresta Zone Control (Property) – Migrated (2025-09-19)
	- Five tables displayed in UI:
		- Sum Insured (above Personal Lines): Zone Description + Gross/Net with totals.
		- Personal Lines, Commercial Lines, Industrial, Engineering: each with category pairs (Gross/Net) per zone, plus totals.
	- Paste from Excel on all five tables with header detection and tolerant numeric parsing.
	- Persistence model (relational):
		- `property_cresta_zone_values` with unique (submission_id, section, zone, category)
		- Sections: 'sum_insured' | 'personal' | 'commercial' | 'industrial' | 'engineering'
		- Zone: 1..19, with 0 representing 'Unallocated'
		- For `sum_insured`, `category` is null; other sections use the configured category keys.
	- Autosave:
		- Per-cell edits call `upsert_property_cresta_zone_value(...)` (debounced).
		- Paste/import per section calls `replace_property_cresta_zone_section(...)` for atomic bulk upsert.
	- One-off backfill RPC `migrate_property_cresta_from_blob(p_submission_id)` available to import legacy `sheet_blobs` payloads.

- Developer experience
	- Vite + HMR development workflow; npm tasks for dev/build.
	- Config‑driven, per‑LoB tab registry for extensibility.
	- Automated documentation generation on pre‑commit.
	- Git hygiene: ignore Excel lock/temp files to avoid accidental commits.

- Database resiliency & indexes
	- Migration enforces (or promotes) a composite primary key on sheet_blobs (submission_id, sheet_name) to enable ON CONFLICT upserts reliably.
	- Functional JSONB indexes added for Header sheet on payload->>'claims_period_start' and payload->>'claims_period_end' to accelerate date‑range queries.

- Climate change exposure (Property) – Reworked (2025-09-09)
	- Replaced legacy columns (region_or_zone, peril, tsi, premium, notes) with expanded policy, exposure, EML/MPL, and premium structure (16 fields).
	- Added auto-calculation of net exposure/premium when blank.
	- Client & server migration: legacy data preserved per row in _legacy.
	- Validation: required inception/expiry ordering, required insured, non-negative numerics, conditional EML/MPL requirement.
	- Updated CSV export and UI totals (sums exclude derived net fields).
	- 2025-09-10: Storage migrated from sheet_blobs JSON to dedicated table `climate_exposure` (one row per record) with row-level security; introduced lazy backfill RPC (`migrate_climate_exposure_from_blob`) invoked only if table empty for a submission to transparently import historical blob data. Autosave pattern unified with other tabular datasets (delete + bulk insert non-empty rows). Added tests covering single-row edit autosave normalization and multi-row paste replacement. Legacy blob entries retained temporarily for safety; planned cleanup after observation window.

- UW Limit (Property) – Migrated (2025-09-11)
	- Replaced blob-based storage (`sheet_blobs` payload: limits[], additional_comments) with relational tables: `uw_limits` (risk_code, limit_value) and `uw_limit_meta` (additional_comments).
	- Added RPCs: `replace_uw_limits` (atomic delete+bulk insert + meta upsert) and `migrate_uw_limit_from_blob` (one-time lazy migration when opening a legacy submission).
	- Database column uses `limit_value`; JSON/API layer preserves `limit` key to avoid breaking existing exports.
	- Autosave now calls `replace_uw_limits` directly; Additional Comments moved out of blob for simpler querying.

- Risk Profile Meta (Property) – Migrated (2025-09-11)
	- Retention and Additional Comments moved from `sheet_blobs` (sheet_name: "Risk Profile") into new table: `risk_profile_meta` (1:1 per submission).
	- Added lazy backfill RPC `migrate_risk_profile_meta_from_blob` executed only if `risk_profile_meta` row missing; preserves legacy blob (flags payload.meta_migrated=true) without destructive deletion.
	- Front-end autosave now upserts retention/comments directly to `risk_profile_meta`; banded distribution data remains in `risk_profile_bands` (unchanged).
	- Submission aggregation function (`get_submission_package`) extended to include `risk_profile_meta` (excluding volatile updated_at) alongside existing datasets; downstream consumers can rely on a stable shape.

## Testing

We use Vitest + React Testing Library (jsdom) for fast, reliable unit/integration tests.

- Tooling: Vitest, @testing-library/react, @testing-library/user-event, jsdom
- Current coverage:
	- Clipboard parser: TSV/CSV with quotes, thousand separators, multi-row paste, and column-mismatch errors.
	- Header autosave: debounced save after input change with Supabase mocked; stabilized with controlled timers.
- How to run locally:

	- All tests (headless):
		- npm test
	- Watch/UI mode (optional):
		- npm run test:ui

- Conventions:
	- Mock Supabase via vi.mock to avoid network calls.
	- For debounce flows, use real timers for initial effects, then fake timers or plain waitFor as appropriate.

- Next steps (recommended):
	- Add integration tests for PasteModal across representative tables (EPI, Treaty Stats, Risk Profile) with expected column validation.
	- Expand clipboard edge cases (escaped quotes, empty trailing cells, mixed delimiters).
