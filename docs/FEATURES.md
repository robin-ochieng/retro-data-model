# Features Tracker

A living log of product features added and planned. Use this doc to coordinate work, demo scope, and draft release notes.

- Branch: feedback/2025-08-28 (working)
- Main repo: https://github.com/robin-ochieng/retro-data-model

## Completed

- Client Details: Country dropdown with African countries
  - Default Country: Kenya
  - Commit(s):
    - 3149aee – feat(header): change Country field to dropdown with African countries list
    - 004a572 – feat(header): set default Country to Kenya in Client Details form
- Client Details: Currency (in std. units) dropdown (stores ISO code)
  - Commit: 30e56fe – feat(header): change Currency to dropdown with ISO code options; keep code as stored value
- Client Details: Dependent dropdowns
  - Class of Business → Line/s of Business
  - Commit: 1652770 – feat(header): add dependent dropdowns for Class of Business and Line/s of Business
- Navigation tabs: Rename “Header” → “Client Details” (both Property and Casualty)
  - Commit: b25fce7 – chore(ui): rename Header tab to Client Details for both LOBs; rebuild docs
- Wizard scaffolding and new steps added (Property + Casualty), Paste Modal, and table improvements
  - Commit: b2972c2 – feat(wizard): add property & casualty steps; implement paste modal and table improvements; docs regen; build config updates
- Site title updated to “Retrocession Hub”
  - Change in: index.html

## In Progress

- Feedback iteration work on branch feedback/2025-08-28

## Planned / Backlog

- Client Details: Treaty Type dropdown
- Make Line/s of Business multi-select (optional)
- Searchable selects for Country and Currency (typeahead)
- Default currency selection (e.g., USD) if required by business rules
- Autosave UX: add subtle status indicator next to each field group

## How to add entries

- For a new feature, add an item under Planned; when work starts, move it to In Progress; on merge, move to Completed with commit link(s).
- Prefer Conventional Commit phrases in bullet titles for clarity.

## Release note template

- Summary: …
- New: …
- Changed: …
- Fixed: …
- Migration/Notes: …
