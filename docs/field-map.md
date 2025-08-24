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
