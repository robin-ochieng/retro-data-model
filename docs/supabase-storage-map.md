# Supabase Storage Map

Authoritative reference describing how the app persists user input to Supabase while filling each tab. Use this alongside:
- docs/field-map.json (detailed per-field schema by tab)
- docs/field-map-slim.json (n8n-friendly Excel mapping)

## Conventions
- submission_id is injected on table inserts.
- sheet_blobs uses upsert with unique key (submission_id, sheet_name).
- Most tables are saved with a delete-then-insert pattern for the current submission.
- Autosave is debounced.

## Property

### Header (sheet: "Header")
- Operation: upsert into sheet_blobs
- Key: (submission_id, sheet_name)
- Payload:
  - name_of_company, country, currency_std_units,
  - munich_re_client_manager, munich_re_underwriter,
  - inception_date, expiry_date, claims_period,
  - class_of_business, lines_of_business, treaty_type,
  - additional_comments

### EPI Summary (sheet: "EPI Summary")
- Operation 1: delete+insert into epi_summary for this submission
  - Row: programme, estimate_type, period_label, epi_value, currency
  - Note: DB also has period_start/period_end, currently unused by the form
- Operation 2: upsert into sheet_blobs
  - Payload: gwp_split[] { section, premium }, additional_comments

### Treaty Statistics (Prop) (sheet: "Treaty Statistics_Prop")
- Operation 1: delete+insert into treaty_stats_prop for this submission
  - Row: uw_year, written_premium, earned_premium, commission_amount, commission_pct, profit_commission,
    total_commission, paid_losses, os_losses, incurred_losses, loss_ratio, uw_profit
  - Unique: (submission_id, uw_year)
- Operation 2: upsert into sheet_blobs
  - Payload: additional_comments

### Treaty Statistics (Non-Prop) (sheet: "Treaty Statistics_Non-Prop")
- Operation: upsert into sheet_blobs as a single payload covering all sections
  - overall[] / cat_layer1[] / cat_layer2[] rows with treaty_year, limit, excess, gnrpi, premium_rate,
    minimum_premium, earned_premium, reinstatement_premium, paid_losses, os_losses, incurred_losses, balance
  - additional_comments
  - Note: a treaty_stats_nonprop table exists in DB but is not used by current UI

### Large Loss List (sheet: "Large Loss List")
- Operation 1: delete+insert into large_loss_list
  - Row: loss_date, uw_year, insured, cause_of_loss, gross_sum_insured, gross_incurred, paid_to_date,
    gross_outstanding, currency, notes
  - Note: earlier/legacy columns (cause, gross_amount, net_amount, etc.) remain in schema but are not populated
- Operation 2: upsert into sheet_blobs
  - Payload: additional_comments

## Keeping this document in sync
- When you add/remove a field or tab, update:
  - docs/supabase-storage-map.json
  - docs/field-map.json
  - docs/field-map-slim.json
  - docs/field-map.md
- Optional: I can add a small script to generate these files directly from the form schemas to ensure accuracy. Let me know if you want this automated.
