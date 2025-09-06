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
