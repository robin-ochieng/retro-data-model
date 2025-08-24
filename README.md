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
