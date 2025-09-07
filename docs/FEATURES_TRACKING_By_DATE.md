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

