# Indexes

This document catalogs all indexes defined by the migrations and their intended usage.

## sheet_blobs

- idx_sheet_blobs_submission on (submission_id)
- idx_sheet_blobs_sub_sheet on (submission_id, sheet_name)
- Functional JSONB (Header-only):

```sql
CREATE INDEX IF NOT EXISTS idx_sheet_blobs_header_claims_start
  ON public.sheet_blobs ((payload->>'claims_period_start'))
  WHERE sheet_name = 'Header';
CREATE INDEX IF NOT EXISTS idx_sheet_blobs_header_claims_end
  ON public.sheet_blobs ((payload->>'claims_period_end'))
  WHERE sheet_name = 'Header';
```

Use when filtering Header payloads by claims period start/end.

## epi_summary

- idx_epi_summary_submission on (submission_id)

## treaty_stats_prop

- idx_treaty_stats_prop_submission on (submission_id)

## risk_profile_bands

- idx_risk_profile_bands_submission on (submission_id)
- idx_risk_profile_bands_sub_segment on (submission_id, segment)

## large_loss_list

- idx_large_loss_list_submission on (submission_id)

## cat_loss_list

- idx_cat_loss_list_submission on (submission_id)

## large_loss_triangle_values

- idx_large_loss_triangle_values_submission on (submission_id)
- idx_large_loss_triangle_values_comp on (submission_id, measure, uw_or_acc_year, development_months)

## top_risks

- idx_top_risks_submission on (submission_id)
- uidx_top_risks_submission_rank unique on (submission_id, rank)
