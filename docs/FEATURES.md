# Features

- Branding and navigation
	- Renamed the “Header” tab to “Client Details” for both Property and Casualty.
	- Updated the site title to “Retrocession Hub”.

- Client Details (data capture)
	- Country dropdown with African countries; default to Kenya; “Other” free‑text fallback.
	- Currency dropdown using ISO 4217 codes; default to USD; “Other” free‑text fallback.
	- Class of Business dropdown with dependent Line(s) of Business; “Other” free‑text fallback; line options auto‑reset on class change.
	- Treaty Type dropdown with common treaty taxonomies; “Other” free‑text fallback.
	- Inline validation with descriptive error surfacing.

- Workflows
	- Property: EPI Summary, Treaty Statistics (Prop/Non‑Prop), UW Limit, Risk Profile, Large Loss List, Large Loss Triangulation, Triangulation, Cresta Zone Control, Top 20 Risks, Climate Exposure.
	- Casualty: Treaty Statistics (Prop/PropCC/Non‑Prop), Rate Development (incl. Motor), Max UW Limit Development, Number of Risks Development, Large Loss List, Large Loss Triangulation, Aggregate Triangulation, CAT Loss Triangulation, Motor Fleet List.

- Data persistence and autosave
	- Supabase‑backed persistence with idempotent upserts to sheet_blobs per step.
	- Transparent autosave across wizard steps with save‑time indicator.
	- Bulk ingestion via CSV paste with client‑side parsing and chunked saves for large payloads.
	- Excel export scaffolding for downstream reporting.
	- Excel templates available under Resources for standardized inputs.

- Security and routing
	- Authentication via Supabase session; gated access with ProtectedRoute.
	- Deep‑linkable routes per tab with state continuity across steps.

- UI/UX
	- Responsive, accessible UI with Tailwind CSS and consistent form patterns.
	- Paste Modal and table usability enhancements for high‑volume data entry.

- Developer experience
	- Vite + HMR development workflow; npm tasks for dev/build.
	- Config‑driven, per‑LoB tab registry for extensibility.
	- Automated documentation generation on pre‑commit.
