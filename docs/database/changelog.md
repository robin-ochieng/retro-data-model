# Changelog

## 2025-09-03 — Schema and Policies

- Established core tables: submissions, sheet_blobs, epi_summary, treaty_stats_prop, risk_profile_bands, large_loss_list, cat_loss_list, large_loss_triangle_values, top_risks.
- Enabled RLS on all core tables with owner-based policies.
- Added helpful indexes including functional JSONB indexes for Header claims period.
- Implemented RPC `public.get_submission_package(uuid)` to aggregate a full submission.

## 2025-09-07 — Profiles Theme Preference

- Added `theme text not null default 'system'` to `public.profiles`.
- No changes to RLS on profiles beyond existing own-profile policies.
