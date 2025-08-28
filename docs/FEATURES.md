# Features

- Renamed tab “Header” to “Client Details” (Property and Casualty).
- Updated site title to “Retrocession Hub”.
- Client Details: Country field is a dropdown with African countries; default set to Kenya; supports “Other”.
- Client Details: Currency (in std. units) is a dropdown using ISO codes; default set to USD; supports “Other”.
- Client Details: Class of Business is a dropdown; Line/s of Business is a dependent dropdown based on the selected class; supports “Other”.
- Client Details: Treaty Type is a dropdown with common treaty types; supports “Other”.
- Added wizard steps for Property and Casualty lines of business.
- Added Paste Modal and table usability improvements.
- Added Excel templates under Resources.
\n+// Additional capabilities
- Supabase-backed persistence with idempotent upserts to sheet_blobs and automatic autosave across wizard steps.
- Schema-driven validation using Zod with react-hook-form resolver and inline error surfacing.
- Authentication and route-guarding via Supabase session with ProtectedRoute to enforce gated access.
- Modular wizard architecture with per-LoB tab registry (config-driven), deep-linkable routes, and state continuity.
- Property workflow coverage: EPI Summary, Treaty Statistics (Prop/Non-Prop), UW Limit, Risk Profile, Large Loss List, Large Loss Triangulation, Triangulation, Cresta Zone Control, Top 20 Risks, Climate Exposure.
- Casualty workflow coverage: Treaty Statistics (Prop/PropCC/Non-Prop), Rate Development (incl. Motor), Max UW Limit Development, Number of Risks Development, Large Loss List, Large Loss Triangulation, Aggregate Triangulation, CAT Loss Triangulation, Motor Fleet List.
- Bulk data ingestion via CSV paste with client-side parsing utilities and chunked save for large payloads.
- Excel export scaffolding to support downstream reporting and handoff (generateExcel).
- Responsive, accessible UI built with Tailwind CSS and semantic form patterns; consistent input styling and contextual hints.
- DX enhancements: Vite + HMR, npm tasks for dev/build, automated documentation generation on pre-commit.
