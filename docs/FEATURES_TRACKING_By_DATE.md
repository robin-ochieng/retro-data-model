# Features Tracking by Date

## 2025-10-08

### Added

- Home Page: Premium gradient borders applied to all major sections for visual consistency.
	- Hero section ("Retrocession Data Hub"): Added gradient border ring (indigo/purple/blue), top edge glow effect, and increased shadow.
	- "Resume recent submissions" section: Added gradient border ring overlay and top edge glow.
	- "Submitted Submissions" section: Added gradient border ring overlay and top edge glow.
	- All sections now feature consistent `border-gray-200 dark:border-gray-700`, `ring-1 ring-inset` with gradient colors, and `shadow-lg`.
- Getting Started Component: Redesigned with numbered badges and increased breathing room.
	- Replaced icon badges (CheckCircle2, Settings2, PlayCircle) with minimal numbered circles (1, 2, 3).
	- Number badges: 20px circles with `bg-white/10`, `text-[11px]`, `font-semibold`, matching theme colors.
	- Removed "Secure & Automatic Saving" feature card for cleaner layout.
	- Kept "Need Help?" section with link to Help Center.
- Typography: Bumped font sizes for improved visual hierarchy.
	- Card titles (H3): Increased from `text-lg` (16px) to `text-[1.0625rem]` (17px).
		- Applied to: "Start New Submission" (HomeStartCard), "Getting started" (GettingStarted).
	- Section titles (H2): Increased from `text-lg` (16px) to `text-[1.125rem]` (18px).
		- Applied to: "Resume recent submissions", "Submitted Submissions".
	- Maintains clear hierarchy: Section titles (18px) > Card titles (17px).
- Spacing Enhancements: Added generous breathing room throughout Getting Started component.
	- Section padding: `p-6` → `p-7` (+4px all around).
	- Header bottom margin: `mb-7` → `mb-8` (+4px).
	- Subtitle top margin: `mt-2` → `mt-2.5` (+2px).
	- Steps spacing: `space-y-5` → `space-y-6` (+4px between steps).
	- Step icon-to-text gap: `gap-3` → `gap-4` (+4px).
	- Step description top margin: `mt-0.5` → `mt-1` (+2px).
	- Help section top margin: `mt-7` → `mt-8` (+4px).
	- Help section padding: `p-4` → `p-5` (+4px).
	- All text uses `leading-relaxed` for comfortable reading.

### Changed

- Status Badge: Changed "In Progress" badge color from bright yellow to subtle blue.
	- Before: `bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300`.
	- After: `bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300`.
	- Improved visual harmony with overall blue/indigo color scheme.
- Home Page Layout: Removed redundant section header for cleaner design.
	- Removed visible "Start a New Submission" heading between hero and cards.
	- Cards now serve as their own visual sections with built-in titles.
	- Added `mt-10` to card grid to maintain proper spacing from hero section.
- Client Dropdown: Enhanced placeholder text color for better UX.
	- Placeholder state: `text-gray-400 dark:text-gray-500` (faded gray).
	- Selected state: `text-gray-900 dark:text-gray-100` (bold dark text).
	- Users can now visually distinguish empty vs. selected state.

### Removed

- Getting Started Component: Removed redundant footer text.
	- Removed: "Autosave is on • Read-only once submitted • Data protected by RLS".
	- Simplified component footer; information available in Help Center if needed.
- Home Page: Removed "Secure & Automatic Saving" feature card from Getting Started.
	- Removed entire Shield icon card explaining autosave security.
	- Streamlined to 3 steps + "Need Help?" section only.

### Implementation Files

- `src/components/home/GettingStarted.tsx`: Redesigned with numbered badges, removed icons, increased spacing, removed footer.
- `src/components/HomeStartCard.tsx`: Enhanced title font size, improved client dropdown placeholder colors.
- `src/components/layout/StatusBadge.tsx`: Changed "In Progress" badge from yellow to blue.
- `src/pages/Home.tsx`: Added gradient borders to hero/sections, removed section header, enhanced typography.

### Design Rationale

- **Visual Consistency**: Gradient borders create a cohesive premium aesthetic across all major sections.
- **Information Hierarchy**: Numbered badges (1, 2, 3) provide clear sequential guidance; larger fonts improve scannability.
- **Breathing Room**: Increased padding and spacing reduce visual clutter, making content easier to digest.
- **Color Harmony**: Blue badge color complements existing indigo/blue accents better than yellow.
- **Simplification**: Removed redundant elements (section header, footer text, extra cards) for cleaner, more focused interface.

## 2025-10-07

### Added

- Homepage: Submitted Submissions section with read-only viewing capability.
	- New "Submitted Submissions" section on homepage displays all submissions with `status='submitted'` (ordered by creation date, limited to last 10).
	- Features "View" button with eye icon for read-only access to submitted data.
	- "Resume recent submissions" section now filters out submitted submissions (shows only in-progress/draft).
	- Card styling includes opacity indicator to visually distinguish submitted from active submissions.
- SubmissionMeta Context: Extended with read-only mode support.
	- Added `isReadOnly: boolean` flag to `SubmissionMetaCtx` type, derived from submission status.
	- On context mount, fetches `status` field from `submissions` table alongside `meta`.
	- Sets `isReadOnly = true` when `status === 'submitted'`.
	- Exposed via `useSubmissionMeta()` hook for all wizard components to consume.
- Wizard: Read-only mode UI indicators and restrictions.
	- **Banner**: Prominent blue informational banner displayed at top of wizard when `isReadOnly` is true.
		- Displays: "Viewing Submitted Submission (Read-Only Mode)"
		- Explains: "This submission has been submitted and cannot be edited. All inputs are disabled."
		- Includes info icon for visual emphasis.
	- **Navigation Buttons**: Previous/Next/Submit buttons completely hidden when viewing submitted submissions to prevent navigation attempts.
	- **Autosave Disabled**: `useAutosave` hook checks `!isReadOnly` flag before scheduling saves.
		- Applied to: `StepEpiSummary`, `StepHeader` (Property).
		- Pattern established for remaining 25+ step components.
		- Formula: `useAutosave(data, saveCallback, 900, !isReadOnly)`.
- Database: Submission status field now drives read-only mode.
	- `submissions.status` field used to determine read-only state (checked on wizard mount).
	- Existing owner-only RLS policies on all tables provide additional protection against unauthorized updates.

### Changed

- Context: `SubmissionMeta.tsx` now fetches and tracks submission status.
	- `loadMeta()` function updated to select `status` field alongside `meta`.
	- `doRefresh()` callback sets `isReadOnly` state based on fetched status.
- Homepage: Submission lists now properly segregated by status.
	- Recent submissions query adds `.neq('status', 'submitted')` filter.
	- Submitted submissions query uses `.eq('status', 'submitted')` filter.
	- Both queries limited to 10 results with proper ordering.
- Wizard Navbar: Status badge remains visible (shows "In Progress" for in-progress, "submitted" for submitted).

### Implementation Files

- `src/context/SubmissionMeta.tsx`: Extended `SubmissionMetaCtx` with `isReadOnly`, added status fetching.
- `src/pages/Home.tsx`: Added submitted submissions section with separate query and "View" button.
- `src/pages/wizard/Wizard.tsx`: Added read-only banner, conditionally hidden navigation buttons.
- `src/pages/wizard/steps/StepEpiSummary.tsx`: Applied `!isReadOnly` to autosave.
- `src/pages/wizard/steps/property/StepHeader.tsx`: Applied `!isReadOnly` to autosave (combined with existing `!loading` check).
- `src/hooks/useAutosave.ts`: Already supports `enabled` parameter (no changes needed).

### Testing

- All 45 existing tests passing.
- Pattern validated for autosave disabling and read-only context propagation.
- Future work: Add dedicated tests for submitted submissions section and read-only wizard mode.

## 2025-09-19

### Added

- Property: Cresta Zone Control migrated from `sheet_blobs` JSON to normalized relational storage with autosave and batch import.
	- Table: `public.property_cresta_zone_values` with owner-only RLS, constraints, indexes, and `updated_at` trigger ([supabase/migrations/20250919_003_property_cresta_zone_values.sql](../supabase/migrations/20250919_003_property_cresta_zone_values.sql)).
	- RPCs: `upsert_property_cresta_zone_value`, `replace_property_cresta_zone_section`, `get_property_cresta_zone_values`, and `migrate_property_cresta_from_blob`.
	- Frontend service: encapsulated API in `getCresta`, `upsertCrestaCell`, `replaceCrestaSection` ([src/lib/cresta.ts](../src/lib/cresta.ts)).
	- UI refactor: per‑cell autosave for grid edits; batch replace on paste/import; separate autosave for zone description ([src/pages/wizard/steps/property/StepCrestaZoneControl.tsx](../src/pages/wizard/steps/property/StepCrestaZoneControl.tsx)).
	- Types: Supabase types extended for new table and RPCs ([src/types/supabase.ts](../src/types/supabase.ts)).
	- Tests: Service unit tests for RPC payloads ([tests/lib/cresta.service.test.ts](../tests/lib/cresta.service.test.ts)).

### Changed

- Documentation: Updated to reflect normalized Cresta persistence and RPCs.
	- Features and storage maps updated ([docs/FEATURES.md](./FEATURES.md), [docs/field-map.md](./field-map.md), [docs/supabase-storage-map.md](./supabase-storage-map.md)).
	- New table doc added and linked from database overview ([docs/database/tables/property_cresta_zone_values.md](./database/tables/property_cresta_zone_values.md), [docs/database/overview.md](./database/overview.md)).

### Fixed

- SQL: Resolved `syntax error at or near "declare"` in `migrate_property_cresta_from_blob` by removing nested procedure declarations and inlining loops ([supabase/migrations/20250919_003_property_cresta_zone_values.sql](../supabase/migrations/20250919_003_property_cresta_zone_values.sql)).

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

## 2025-09-15

### Added

- Property: Large Loss Triangulation migrated from a single generic values table + `sheet_blobs` extras to dedicated relational tables with owner‑only RLS and indexes:
	- Header table `large_loss_triangle_header_prop` (adds `date_of_loss` and `claim_policy_no`; includes `uw_or_acc_year`, `loss_description`, `threshold`, `claim_status`).
	- Split development tables `large_loss_triangle_paid_prop`, `large_loss_triangle_reserved_prop`, and `large_loss_triangle_incurred_prop` with unique `(submission_id, loss_identifier, development_months)`.
- Front‑end refactor: step now shows three grids (Paid, Reserved, Incurred). Incurred is derived from Paid + Reserved and persisted for reporting.
- Paste UX updated: header paste retained; Paid/Reserved supported; Incurred paste blocked with guidance.
- Tests: integration test added to verify header persistence (including new fields), Paid/Reserved save, Incurred auto‑calc, and reload.

- Property: Cat Loss List migrated to relational tables with meta and RLS:
	- Tables: `cat_loss_list_prop` (rows) and `cat_loss_list_meta_prop` (Additional Comments) with index on submission_id and owner‑only policies.
	- UI: DOL input switched to free‑text for better Excel paste; normalization to ISO occurs at save when possible.
	- Migration: [supabase/migrations/20250915_006_cat_loss_list_prop.sql](../supabase/migrations/20250915_006_cat_loss_list_prop.sql).

### Changed

- LLT (Property): Autosave now clears and reinserts header rows (delete + chunked insert) to avoid unique constraint cleanup edge cases; a verify `select(...).limit(1)` check was added to surface RLS ownership issues explicitly. Grid saves changed from delete+insert to idempotent upsert with in‑memory deduping on `(loss_identifier, development_months)` to eliminate duplicate key errors.

### Removed

- Property LL Triangulation no longer stores header extras in `sheet_blobs`; date_of_loss and claim/policy are now relational.

## 2025-10-06

### Added

- Excel Generation: Enhanced `generateExcel.ts` with metadata-driven spacing and section titles for improved Excel layout.
	- Added support for `_meta.spacing` configuration in field maps to control spacing between tables and before Additional Comments.
	- Added support for `_meta.sections` to render titled sections (e.g., "Premium Summary (EPI)", "GWP Split by Class & LoB") in Excel tabs.
	- Implemented cell-by-cell positioning logic to properly place Additional Comments below tables with configurable spacing.
	- Updated `docs/field-map-slim.json` with spacing metadata for Treaty Statistics Non-Prop (3 tables with proper spacing) and EPI Summary.
- Field Mappings: Updated column structures for multiple Excel tabs.
	- **Top 20 Risks**: Updated from 8 columns to 12 columns (Risk Code, Insured, Location, Occupancy, Construction, Year Built, Gross Sum Insured, Deductible, Sublimit, AAL, PML 100, PML 250).
	- **Climate Change Exposure**: Added new tab with 16 columns after Top 20 Risks (Policy Inception Date, Policy Expiry Date, Name of Insured, Category, Type of Risk, Peril, Gross Exposure SI, Gross Premium, Ceded Exposure, Ceded Premium, Net Exposure, Net Premium, EML/MPL Limit, EML/MPL Limit Applied, Retention, Notes).
	- **UW Limit**: Added new tab with proper database table mapping to `uw_limits` (Risk Code, Limits) and `uw_limit_meta` (Additional Comments).
- Currencies: Added 20 strong African currencies to CURRENCIES array in `StepHeader.tsx` (both Property and Casualty).
	- New currencies: BWP, CFA (BCEAO), CFA (BEAC), DZD, EGP, ETB, GHS, KES, MAD, MGA, MUR, MWK, MZN, NAD, NGN, RWF, SCR, TZS, UGX, ZMW.
	- Total currencies now 50+ including USD, EUR, GBP, and African currencies.
- Client Data Management: Created centralized client options data file.
	- New file: `src/data/clients.ts` with `CLIENT_OPTIONS` array containing 40 preset options (5 reinsurers + 35 insurance companies).
	- Type-safe `ClientOption` type exported for use across the application.
- UI Improvements: Converted free-text client inputs to dropdowns for data consistency.
	- **Homepage**: Converted "Client" field from text input to dropdown using `CLIENT_OPTIONS` with placeholder "ZEP-RE (PTA Reinsurance Company)".
	- **Client Details (Header) Tab**: Converted "Name of Company" field from text input to dropdown using the same `CLIENT_OPTIONS` array.
	- Both dropdowns use native `<select>` elements with dark mode compatible styling and maintain autosave functionality.

### Changed

- Excel Generation: Refactored to use metadata-driven approach for more flexible and maintainable Excel layouts.
	- `generateExcel.ts` now reads `_meta.spacing` and `_meta.sections` from field maps instead of hardcoded offsets.
	- Additional Comments positioning now respects configured spacing (default 2 blank rows) for better visual separation.
- Field Mappings: Comprehensive updates to align with current database schema and Excel requirements.
	- Treaty Statistics Non-Prop: Added 3-section structure with proper spacing (Premium, Claims by LoB, Aggregate Deductible).
	- EPI Summary: Added spacing metadata for proper Additional Comments placement.
- Tests: Updated `Header.db.test.tsx` to accommodate dropdown conversion.
	- Changed from `user.clear()` and `user.type()` to `user.selectOptions()` for "Name of Company" field.
	- Updated test assertions to use "APA Insurance Kenya Limited" from CLIENT_OPTIONS instead of free-text "New Company PLC".

### Fixed

- Excel Spacing: Resolved issue where Additional Comments were appearing inline with tables instead of below them.
	- Implemented proper spacing calculations in `generateExcel.ts` based on metadata configuration.
	- Fixed Treaty Statistics Non-Prop Excel output to show 3 distinct sections with proper spacing.
- Test Compatibility: Fixed test failure after converting Name of Company to dropdown.
	- Updated test to use `selectOptions()` instead of text input methods.
	- All 45 tests now passing consistently.

