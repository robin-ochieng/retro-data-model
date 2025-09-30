# Retrocession Data Hub (Kenbright Re)

A Vite + React + TypeScript + Tailwind app with Supabase for auth and persistence. It provides a config-driven multi-step wizard per Line of Business (LoB) with autosave, resume, and Excel-like tabs (Property: Header, EPI Summary, Treaty Stats Prop/Non-Prop, Large Loss List).

## Quick start

- Prerequisites: Node 18+, a Supabase project, and env vars configured.
- Copy `.env.example` to `.env.local` and fill in Supabase keys/URL.

### Scripts
- Dev: `npm run dev`
- Build: `npm run build`
- Preview: `npm run preview`

## Notes
- Autosave persists tables (epi_summary, treaty_stats_prop, large_loss_list) and aux data/comments via `sheet_blobs` per sheet name.
- Wizard routes: `/wizard/:lob/:submissionId/:tabKey` with absolute navigation to avoid 404s.
- Shared `.input` class in `src/index.css` provides consistent form styling.

## Troubleshooting
- If styles don’t apply, ensure Tailwind is built and `index.css` is imported.
- If Supabase auth fails, check env variables and network access.

## Automation: Docs Generation

The repository auto-generates documentation artifacts from the field maps and storage schema to keep implementation and docs in sync.

- What runs:
	- `scripts/generate-docs.cjs` (invoked by `npm run generate:docs`)
	- It reads canonical definitions from `docs/field-map*.json` and `docs/supabase-storage-map*.json`
	- It writes consolidated outputs into:
		- `docs/field-map.generated.json`
		- `docs/field-map-slim.generated.json`
		- `docs/supabase-storage-map.generated.json`
		- `docs/GENERATED.md`

- When it runs:
	- Automatically as part of `npm run build` (see package.json: build runs generate:docs first)
	- You can run it manually anytime:
		- npm run generate:docs

- Why it matters:
	- Ensures UI tables, Supabase schema, and help docs share a single source of truth.
	- Minimizes drift when adding/changing fields.

If you adjust any field map or storage mapping, re-run `npm run generate:docs` and commit the resulting changes in `docs/*.generated.*` to keep CI and collaborators aligned.

## Theming

Light/Dark/System theming is implemented via Tailwind CSS variables mapped in `tailwind.config.js` and tokens defined in `src/index.css`.

- Provider: `src/theme/ThemeProvider.tsx` wraps the app and applies `html.dark` when resolved mode is dark.
- Modes: `light`, `dark`, `system` (default). System respects OS `prefers-color-scheme` and updates live.
- Persistence: Signed-in users persist to `profiles.theme`; signed-out users persist to `localStorage` key `theme_mode`.
- Toggle: `src/components/ThemeToggle.tsx` renders a simple 3-option control and is placed in headers.

Use semantic Tailwind colors to benefit from tokens:

- Background/text: `bg-background`, `text-foreground`
- Primary: `bg-primary`, `text-primary-foreground`
- Borders: `border-border`

You can gradually adopt tokens; existing classes remain working.

## Client-Side Excel Generation (Property LoB)

The file `docs/field-map-slim.json` drives multi-sheet Excel generation for the Property line of business. Tabs now include Sum Insured, Personal, Commercial, Industrial, Engineering, Top 20 Risks, Aggregate Triangle in addition to existing Header / EPI / Treaty / Large Loss sheets.

### Mapping Format
Each object under `tabs` supplies:
- `sheetName`: Excel tab name (truncated to 30 chars when writing)
- `excelColumns`: one or more data sources
	- `table:table_name[:col=value]` arrays: specify header ordering; rows filtered by submission and optional equality filters.
	- `sheet_blobs` object: pulls scalar `fields` (payload key -> Header Label) and array sections `array:<payload_key>` describing column headers for array elements.

### Generation Flow
`generateExcel(submissionId)` (in `src/lib/generateExcel.ts`):
1. Loads mapping JSON and the `sheet_blobs` payload (currently only `Header`).
2. For each `table:` spec queries Supabase with `submission_id` + filters.
3. Normalizes rows to declared header order; falls back to simple heuristic matching.
4. Assembles all sheets with `xlsx` (dynamically imported) and returns `{ ok, url, blob }` where `url` is an object URL for direct download.

### Using In UI
After submission, call `generateExcel(id)` and, if `ok`, either auto-trigger a download or show a link:
```tsx
const res = await generateExcel(submissionId);
if (res.ok && res.url) {
	const a = document.createElement('a');
	a.href = res.url;
	a.download = `${submissionId}.xlsx`;
	a.click();
}
```

### Limitations / Next Steps
-
## Loader Components

Modern, accessible loading primitives live in `src/components/loaders/`:

| Component | Purpose | Notes |
|-----------|---------|-------|
| `Spinner` | Primary indeterminate action | SVG stroke animation (dash / offset) + fade-in |
| `DotsLoader` | Subtle background activity (e.g., secondary area) | Pulsing three-dot sequence |
| `Skeleton` | Placeholder for blocks of forthcoming content | Uses shimmer gradient with reduced motion respects OS setting (inherit) |
| `LoadingOverlay` | Dim + blur underlying content while an action runs | Wrap existing content; shows `Spinner` centered |
| `Loader` | Unified wrapper to pick `spinner` or `dots` by variant | Simplifies inline conditional usage |

### Usage Examples

```tsx
import { Spinner, DotsLoader, Skeleton, LoadingOverlay, Loader } from '@/components/loaders';

<Spinner label="Saving" />
<DotsLoader label="Syncing" size={10} />
<Skeleton lines={4} className="mt-4" />
<LoadingOverlay show={isSubmitting} label="Submitting">{children}</LoadingOverlay>
<Loader variant="dots" label="Working" />
```

All animations are implemented with Tailwind + custom keyframes (see `index.css`). Colors inherit current text color to support dark mode automatically. Keep loader usage minimal—prefer optimistic UI updates over long spinners.

- Only one `sheet_blobs` pull (Header). If other sheet-specific blobs are revived, extend fetch to parameterize `sheet_name`.
- Column heuristic might mis-map ambiguous labels; upgrade by allowing objects like `{ field: 'gross', header: 'Gross (Net of Fac)' }`.
- Large datasets may warrant pagination or server-side generation (edge function + Storage).
- Add style formatting (column widths, number formats) by post-processing the worksheet objects.

