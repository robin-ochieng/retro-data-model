# Field Map (Business Reference)

This document describes the data captured per tab and where it is stored. Use it alongside `docs/field-map.json` (detailed schema) and `docs/field-map-slim.json` (n8n-friendly mapping to Excel columns).

## Property

### Header (sheet: "Header")
- Storage: sheet_blobs (keyed by submission_id + sheet_name)
- Fields:
  - Name of Company, Country, Currency (std. units)
  - Munich RE Client Manager, Munich RE Underwriter
  - Inception Date, Expiry Date, Claims Period
  - Class of Business, Line/s of Business, Treaty Type
  - Additional Comments (sheet_blobs.payload.additional_comments)

### EPI Summary (sheet: "EPI Summary")
- Storage:
  - Table: epi_summary (rows)
    - programme, estimate_type, period_label, epi_value, currency
  - sheet_blobs (payload):
    - gwp_split[]: { section, premium }
    - additional_comments

### Treaty Statistics (Prop) (sheet: "Treaty Statistics_Prop")
- Storage:
  - Table: treaty_stats_prop (rows)
    - uw_year, written_premium, earned_premium, commission_amount, commission_pct, profit_commission,
      total_commission, paid_losses, os_losses, incurred_losses, loss_ratio, uw_profit
  - sheet_blobs (payload):
    - additional_comments

### Treaty Statistics (Non-Prop) (sheet: "Treaty Statistics_Non-Prop")
- Storage: sheet_blobs (single payload for all sections)
  - overall[]: treaty_year, limit, excess, gnrpi, premium_rate, minimum_premium, earned_premium,
    reinstatement_premium, paid_losses, os_losses, incurred_losses, balance
  - cat_layer1[]: same shape
  - cat_layer2[]: same shape
  - additional_comments

### Large Loss List (sheet: "Large Loss List")
- Storage:
  - Table: large_loss_list (rows)
    - loss_date, uw_year, insured, cause_of_loss, gross_sum_insured, gross_incurred, paid_to_date,
      gross_outstanding, currency, notes
  - sheet_blobs (payload):
    - additional_comments

---

Keep these files in sync when fields or tabs change:
- docs/field-map.json (detailed schema for storage and payloads)
- docs/field-map-slim.json (Excel column mapping for n8n)
- docs/field-map.md (this descriptive guide)

If you add or remove fields/tabs, update all three files. I can automate this syncing if we centralize field definitions in code and add a script to regenerate the docs—tell me if you want that next.

### Climate change exposure (sheet: "Climate change exposure")
- Storage: sheet_blobs (payload.rows[])
- New Schema (2025-09-09 rework): each row has
  - policy_inception_date (date, required)
  - policy_expiry_date (date, required, >= inception)
  - insured (text, required)
  - policy_category (text)
  - policy_description (text)
  - nature_of_risk (text)
  - gross_exposure_tsi (numeric ≥ 0)
  - cedants_exposure_tsi (numeric ≥ 0)
  - eml_mpl_limit_applied (number; previously boolean, >0 indicates applied)
  - eml_mpl_limit (numeric ≥ 0 if applied)
  - ceded_prop_reinsurance_exposure (numeric ≥ 0)
  - net_inuring_prop_reinsurance_exposure (numeric ≥ 0, optional manual / derived)
  - gross_premium (numeric ≥ 0)
  - cedants_premium (numeric ≥ 0)
  - ceded_prop_reinsurance_premium (numeric ≥ 0)
  - net_prop_reinsurance_premium (numeric ≥ 0, optional manual / derived)
  - _legacy (object, only present for migrated rows containing the original row with region_or_zone, peril, tsi, premium, notes)
- Migration:
  - Legacy rows detected by presence of region_or_zone/peril fields are transformed to new keys and preserved under _legacy.
  - A server-side SQL migration (`20250909_001_climate_change_exposure_rework.sql`) performs bulk update; client also migrates on load if needed.
  - Old columns (region_or_zone, peril, tsi, premium, notes) are deprecated and no longer shown in UI.
