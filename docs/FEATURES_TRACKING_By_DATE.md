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

### Changed

- N/A

### Removed

- N/A

