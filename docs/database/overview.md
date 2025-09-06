# Database Architecture Overview

This schema models a parent Submission with flexible per-sheet JSON payloads and table-backed analytical datasets. It supports secure, owner-only access via Row Level Security (RLS) and exposes a convenience RPC to retrieve a full submission package.

## ERD

Source: [erd.mmd](./erd.mmd)

If Mermaid CLI is available, render `erd.mmd` into `erd.png` and preview locally.

Windows PowerShell example:

```
npm exec -y -c "mmdc -i docs/database/erd.mmd -o docs/database/erd.png"
```

Once rendered, embed the PNG here if desired.

Tables (see docs in tables/):

- [submissions](./tables/submissions.md) — Parent entity for each data collection workflow (LoB, status, meta)
- [sheet_blobs](./tables/sheet_blobs.md) — Flexible JSONB per sheet/tab keyed by (submission_id, sheet_name)
- [epi_summary](./tables/epi_summary.md) — Premium summary rows
- [treaty_stats_prop](./tables/treaty_stats_prop.md) — Treaty statistics (Property) with unique (submission_id, uw_year)
- [risk_profile_bands](./tables/risk_profile_bands.md) — Risk profile bands by segment (gross/net)
- [large_loss_list](./tables/large_loss_list.md) — Large losses
- [cat_loss_list](./tables/cat_loss_list.md) — Catastrophe losses
- [large_loss_triangle_values](./tables/large_loss_triangle_values.md) — Large loss development values
- [top_risks](./tables/top_risks.md) — Top 20 risks with unique (submission_id, rank)
- [profiles](./tables/profiles.md) — User profile (theme preference added in 2025‑09‑07 migration)

## JSONB usage and computed indexes

The `sheet_blobs` table stores per-sheet payloads under `payload` (JSONB). To accelerate common queries, functional indexes are defined, e.g.:

```sql
CREATE INDEX IF NOT EXISTS idx_sheet_blobs_header_claims_start
  ON public.sheet_blobs ((payload->>'claims_period_start'))
  WHERE sheet_name = 'Header';
CREATE INDEX IF NOT EXISTS idx_sheet_blobs_header_claims_end
  ON public.sheet_blobs ((payload->>'claims_period_end'))
  WHERE sheet_name = 'Header';
```

## RPC

The function `public.get_submission_package(uuid)` aggregates a submission row, child table arrays, and all sheet_blobs keyed by sheet_name into a single JSONB payload for read/exports.

See:

- [Tables](./tables)
- [Policies](./policies.md)
- [Indexes](./indexes.md)
- [RPC](./rpc.md)
- [Glossary](./glossary.md)
- [Changelog](./changelog.md)
