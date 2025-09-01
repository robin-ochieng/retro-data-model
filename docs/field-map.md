# Field Map

This document summarizes the tabs, their sheet names, and storage shapes inferred from the codebase.

## Tabs

- epi-summary — sheet: EPI Summary
- large-loss-list — sheet: Large Loss List
- treaty-stats-prop — sheet: Treaty Statistics_Prop
- stepcatlosstriangulation — sheet: Unknown
- stepcatlosslist — sheet: Cat Loss List
- stepclimateexposure — sheet: Climate change exposure
- large-loss-triangulation — sheet: Large Loss Triangulation (Property)
- stepriskprofile — sheet: Unknown
- steptop20risks — sheet: Unknown

## Storage

### epi-summary (EPI Summary)

- table: epi_summary (deleteInsert)
- table: epi_summary (insert)
- table: epi_summary (deleteInsert)
- table: epi_summary (deleteInsert)
- table: epi_summary (insert)

### large-loss-list (Large Loss List)

- table: large_loss_list (deleteInsert)
- table: large_loss_list (insert)
- table: large_loss_list (deleteInsert)
- table: large_loss_list (deleteInsert)
- table: large_loss_list (insert)
- table: large_loss_list (insert)

### treaty-stats-prop (Treaty Statistics_Prop)

- table: treaty_stats_prop (deleteInsert)
- table: treaty_stats_prop (deleteInsert)
- table: treaty_stats_prop (deleteInsert)

### stepcatlosstriangulation (Unknown)

- table: triangle_values (insert)
- table: triangle_values (insert)
- table: triangle_values (insert)

### stepcatlosslist (Cat Loss List)

- table: cat_loss_list (deleteInsert)
- table: cat_loss_list (insert)
- table: cat_loss_list (deleteInsert)
- table: cat_loss_list (deleteInsert)
- table: cat_loss_list (insert)
- table: cat_loss_list (insert)
- sheet_blobs upsert — key: [submission_id, sheet_name] — payload: additional_comments — sheet_name: Cat Loss List

### stepclimateexposure (Climate change exposure)

- sheet_blobs upsert — key: [submission_id, sheet_name] — sheet_name: Climate change exposure
- sheet_blobs upsert — key: [submission_id, sheet_name] — payload: exposures — sheet_name: Climate change exposure

### large-loss-triangulation (Large Loss Triangulation (Property))

- table: large_loss_triangle_values (insert)
- table: large_loss_triangle_values (insert)
- table: large_loss_triangle_values (insert)

### stepriskprofile (Unknown)

- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (insert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (insert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (insert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (insert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (deleteInsert)
- table: risk_profile_bands (insert)

### steptop20risks (Unknown)

- table: top_risks (deleteInsert)
- table: top_risks (insert)
- table: top_risks (deleteInsert)
- table: top_risks (deleteInsert)
- table: top_risks (insert)
- table: top_risks (insert)
