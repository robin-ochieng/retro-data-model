# Features Tracking by Date

## 2025-09-03

### Added

- Database: Core tables and owner-based RLS for submissions and related tables ([supabase/migrations/20250903_000_schema_and_policies.sql](../supabase/migrations/20250903_000_schema_and_policies.sql)).
- Performance: JSONB indexes for Header claims period fields ([supabase/migrations/20250903_000_schema_and_policies.sql](../supabase/migrations/20250903_000_schema_and_policies.sql)).
- API: get_submission_package(uuid) to bundle submission data ([supabase/migrations/20250903_000_schema_and_policies.sql](../supabase/migrations/20250903_000_schema_and_policies.sql)).

### Changed

- N/A

### Removed

- N/A

## 2025-09-07

### Added

- Profiles: theme preference column for per-user theming ([supabase/migrations/20250907_001_add_theme_to_profiles.sql](../supabase/migrations/20250907_001_add_theme_to_profiles.sql)).
- App: Light/Dark/System theming with Tailwind tokens and Theme toggle ([src/theme/ThemeProvider.tsx](../src/theme/ThemeProvider.tsx), [src/components/ThemeToggle.tsx](../src/components/ThemeToggle.tsx), [tailwind.config.js](../tailwind.config.js), [src/index.css](../src/index.css)).
- App: Accessible Theme dropdown (ARIA, keyboard, outside click/Escape) replacing button group; tests added ([tests/theme/ThemeDropdown.test.tsx](../tests/theme/ThemeDropdown.test.tsx), [tests/theme/resolveTheme.test.tsx](../tests/theme/resolveTheme.test.tsx)).

- UI: Help Center overhaul with sticky TOC, anchors, callouts, FAQ, and links to database docs and features ([src/pages/Help.tsx](../src/pages/Help.tsx), [src/pages/help/*](../src/pages/help)).
- UI: Login/Sign‑up page polish (centered card, accessible form, header/footer, password toggle, loading spinner) without changing auth logic ([src/pages/Login.tsx](../src/pages/Login.tsx)).
- UI: Wizard tab icons using lucide-react for both Property and Casualty flows ([src/components/icons/TabIcons.tsx](../src/components/icons/TabIcons.tsx), [src/pages/wizard/Wizard.tsx](../src/pages/wizard/Wizard.tsx)).
- Assets: Added dark‑mode logo variant ([public/Retrocession_Hub_Dark_Mode_Variant.png](../public/Retrocession_Hub_Dark_Mode_Variant.png)); `Logo` chooses variant by theme ([src/components/Logo.tsx](../src/components/Logo.tsx)).

### Changed

- Navbar: Help appears only after authentication (Home/Wizard). On Login, Help moved into the card footer ([src/pages/Login.tsx](../src/pages/Login.tsx)).
- Logo: Normalized sizes and theme-aware variant used across header/login ([src/components/Logo.tsx](../src/components/Logo.tsx)).

### Removed

- N/A

## 2025-09-09

### Added

- Property: Reworked "Climate change exposure" tab with expanded 16-field schema (policy dates, insured, categorization, exposure & premium breakdown, EML/MPL, ceded & net fields) ([src/pages/wizard/steps/property/StepClimateExposure.tsx](../src/pages/wizard/steps/property/StepClimateExposure.tsx), [src/types/climateExposure.ts](../src/types/climateExposure.ts)).
- Migration: Client-side legacy row transformer plus SQL migration preserving original row under _legacy ([supabase/migrations/20250909_001_climate_change_exposure_rework.sql](../supabase/migrations/20250909_001_climate_change_exposure_rework.sql)).
- Tests: Validation, auto-calculation, and migration tests for new model ([src/types/__tests__/climateExposure.test.ts](../src/types/__tests__/climateExposure.test.ts)).

### Changed

- Deprecated legacy columns (region_or_zone, peril, tsi, premium, notes) for Climate change exposure; UI now shows new schema only. CSV export updated.

### Removed

- Old climate exposure columns from UI (retained only in _legacy for migrated rows).

## 2025-09-10

### Changed

- Climate change exposure: Policy Inception Date & Policy Expiry Date fields converted from native date inputs to paste-friendly text inputs accepting multiple formats (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) with client-side normalization to ISO and validation (expiry >= inception). ([src/types/climateExposure.ts](../src/types/climateExposure.ts), [src/pages/wizard/steps/property/StepClimateExposure.tsx](../src/pages/wizard/steps/property/StepClimateExposure.tsx)).

### Added

- Date normalization utility `normalizeDateString` for Climate change exposure rows.

### Removed

- Native HTML date picker usage on Climate change exposure dates (improves bulk Excel paste workflow).

### Added (later 2025-09-10)

- Climate change exposure: Robust numeric paste parsing (commas, spaces, parentheses negatives) via `parseNumeric`; converted `eml_mpl_limit_applied` from boolean checkbox to numeric field (null or >0) with conditional validation of `eml_mpl_limit`. Added JSON migration to transform stored boolean values ([supabase/migrations/20250910_002_climate_exposure_numeric_applied.sql](../supabase/migrations/20250910_002_climate_exposure_numeric_applied.sql)).

### Added (final 2025-09-10)

- Climate change exposure persistence migrated from `sheet_blobs` JSON to relational table `climate_exposure` with RLS policy `climate_exposure_owner_all` and delete+bulk insert autosave pattern.
- Lazy backfill RPC `migrate_climate_exposure_from_blob(submission_id uuid)` created; invoked on first load only when a submission has legacy blob but no table rows.
- Updated `get_submission_package` function to return `climate_exposure` rows directly.
- Added Vitest integration tests for autosave normalization (single-row edit) and multi-row Excel paste (16-column header + two data rows) confirming date normalization and numeric parsing.
- Documentation updated in `FEATURES.md` and this tracking file to reflect migration and testing.

## 2025-09-11

### Added

- Property: UW Limit migrated from `sheet_blobs` to relational tables `uw_limits` and `uw_limit_meta` with atomic RPC save.
	- RPCs: `replace_uw_limits(p_submission_id uuid, p_rows jsonb, p_additional_comments text)` and `migrate_uw_limit_from_blob(p_submission_id uuid)`.
	- Migrations: [20250911_001_uw_limit_table.sql](../supabase/migrations/20250911_001_uw_limit_table.sql).
- Property: Risk Profile meta (retention, additional comments) migrated to dedicated table `risk_profile_meta` with lazy backfill RPC.
	- RPC: `migrate_risk_profile_meta_from_blob(p_submission_id uuid)`.
	- Migrations: [20250911_002_risk_profile_meta.sql](../supabase/migrations/20250911_002_risk_profile_meta.sql).
- API: Unified canonical `get_submission_package(submission_id uuid)` with versioning and inclusion of new relational datasets.
	- Migration: [20250911_003_unify_submission_package.sql](../supabase/migrations/20250911_003_unify_submission_package.sql).
- Tests:
	- UW Limit relational autosave and persistence (`tests/wizard/steps/UwLimit.db.test.tsx`).
	- Large Loss List autosave & persistence, including comments (`tests/wizard/steps/LargeLossList.db.test.tsx`).
	- Snapshot for `get_submission_package` (`tests/api/getSubmissionPackage.snapshot.test.ts`).

### Changed

- Large Loss List: Date of Loss (DOL) input changed from native `date` to plain text to improve Excel paste reliability; persistence continues to `large_loss_list` table (additional comments via `sheet_blobs`).
- UW Limit front-end now calls `replace_uw_limits` directly (no longer writes to `sheet_blobs`); JSON row key `limit` is preserved for compatibility while database column is `limit_value`.

### Removed

- No removals; legacy `sheet_blobs` entries retained for safety and lazy migration paths.

