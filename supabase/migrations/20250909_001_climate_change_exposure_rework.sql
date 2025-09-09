-- Migration: Rework Climate change exposure sheet JSON structure
-- Date: 2025-09-09
-- Preserves legacy row under _legacy key per row while introducing new keys.
-- This is an idempotent best-effort transformation; rows already migrated (presence of policy_inception_date) are skipped.

-- Helper inline safe numeric cast using CASE WHEN regex; avoids creating a database function.
WITH target AS (
  SELECT id, payload
  FROM sheet_blobs
  WHERE sheet_name = 'Climate change exposure'
)
UPDATE sheet_blobs sb
SET payload = jsonb_build_object(
  'rows', (
    SELECT jsonb_agg(
      CASE
        WHEN (row ? 'policy_inception_date') THEN row -- assume migrated
        ELSE jsonb_build_object(
          'policy_inception_date', NULL,
          'policy_expiry_date', NULL,
          'insured', '',
          'policy_category', row->>'region_or_zone',
          'policy_description', row->>'notes',
          'nature_of_risk', row->>'peril',
          'gross_exposure_tsi', CASE WHEN (row->>'tsi') ~ '^[0-9]+(\.[0-9]+)?$' THEN (row->>'tsi')::numeric ELSE NULL END,
          'cedants_exposure_tsi', NULL,
          'eml_mpl_limit_applied', NULL,
          'eml_mpl_limit', NULL,
          'ceded_prop_reinsurance_exposure', NULL,
          'net_inuring_prop_reinsurance_exposure', NULL,
          'gross_premium', CASE WHEN (row->>'premium') ~ '^[0-9]+(\.[0-9]+)?$' THEN (row->>'premium')::numeric ELSE NULL END,
          'cedants_premium', NULL,
          'ceded_prop_reinsurance_premium', NULL,
          'net_prop_reinsurance_premium', NULL,
          '_legacy', row
        )
      END
    )
    FROM jsonb_array_elements(COALESCE(sb.payload->'rows', sb.payload->'exposures', '[]'::jsonb)) AS row
  ),
  'migrated', true
)
WHERE id IN (SELECT id FROM target);

-- Verification query (optional):
-- SELECT sheet_name, (payload->'rows'->0) AS sample_first_row FROM sheet_blobs WHERE sheet_name='Climate change exposure' LIMIT 1;
