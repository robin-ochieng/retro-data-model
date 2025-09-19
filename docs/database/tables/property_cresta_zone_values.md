# property_cresta_zone_values

Normalized storage for the Property “Cresta Zone Control” tab.

- Primary key: `id bigserial`
- Unique: `(submission_id, section, zone, category)`
- RLS: enabled; owner-only via submissions.user_id = auth.uid()

Columns
- `submission_id uuid not null` → FK to `submissions(id)` on delete cascade
- `section text not null` → one of 'sum_insured' | 'personal' | 'commercial' | 'industrial' | 'engineering'
- `zone smallint not null` → 1..19 where 0 represents 'Unallocated'
- `zone_description text not null default ''`
- `category text` → null for 'sum_insured'; otherwise per-section categories
- `gross numeric(20,6) not null default 0`
- `net numeric(20,6) not null default 0`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()` (maintained by trigger)

Indexes
- `uq_property_cresta_zone_values (submission_id, section, zone, category)`
- `idx_property_cresta_zone_values_submission (submission_id)`
- `idx_property_cresta_zone_values_section (submission_id, section)`

RPC
- `upsert_property_cresta_zone_value(p_submission_id, p_section, p_zone, p_category, p_zone_description, p_gross, p_net)`
- `replace_property_cresta_zone_section(p_submission_id, p_section, p_rows, p_delete_missing boolean default false)`
- `get_property_cresta_zone_values(p_submission_id)`
- `migrate_property_cresta_from_blob(p_submission_id)` (one-time backfill from legacy sheet_blobs)

Notes
- For 'sum_insured', `category` is null; for other sections use configured keys (e.g., buildings, content, buildings_contents, motor, bi, others, engineering).
- Zone 0 is used to represent 'Unallocated' in normalized form.
