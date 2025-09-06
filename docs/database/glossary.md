# Glossary

- Submission — Parent entity representing a user-owned data collection workflow.
- Line of Business (LoB) — One of 'property' or 'casualty'.
- Sheet Blobs — Flexible per-sheet/tab JSON payload stored in `sheet_blobs.payload` keyed by `(submission_id, sheet_name)`.
- EPI Summary — Premium summary values (table `epi_summary`).
- Treaty Statistics (Prop) — Historical premium/claims metrics by underwriting year (table `treaty_stats_prop`).
- Risk Profile Bands — Gross/Net exposure and claims bands (table `risk_profile_bands`).
- Large Loss List — Individual large loss records (table `large_loss_list`).
- Cat Loss List — Catastrophe loss records (table `cat_loss_list`).
- Large Loss Triangulation — Development values for large losses (table `large_loss_triangle_values`).
- Top 20 Risks — Ranked top risks per submission (table `top_risks`).
- Profiles — User profile table; includes `theme` preference (migration 2025-09-07).
