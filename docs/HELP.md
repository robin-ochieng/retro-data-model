# Help & User Guide

## Introduction

Welcome to Retrocession Hub. This application streamlines collection of client and treaty data across Property and Casualty lines of business through a guided, autosaving wizard.

## Getting Started

1. Access the app
   - Open the provided URL in a modern browser (Chrome, Edge, or Firefox).
2. Sign in
   - Enter your email and password on the Login screen.
   - If your organization uses single sign‑on or sign‑up is restricted, contact your administrator for access.
3. Create or open a submission
   - From the Home page, start a new submission or continue an existing one.
   - Your progress autosaves as you move through steps.

## Navigation Guide

- Top bar
  - App branding and quick navigation.
- Left navigation (tabs)
  - Select the Line of Business (Property or Casualty) and step through the tabs in order.
- Main workspace
  - Forms and tables for data entry with inline validation and autosave status.

## Using Core Features

### Client Details
- Country
  - Dropdown with African countries; defaults to Kenya. Choose “Other” to type a custom value.
- Currency (std. units)
  - Dropdown of ISO 4217 codes; defaults to USD. Choose “Other” to type a custom value.
- Class of Business and Line(s) of Business
  - Class is a dropdown; Lines are dependent on the selected class. Choose “Other” to type a custom value.
- Treaty Type
  - Dropdown of common treaty types with an “Other” option. The selected Treaty Type becomes the default for EPI Summary rows.

### Data Tabs (Property order)
- Client Details
- EPI Summary
- Treaty Statistics (Prop)
- Treaty Statistics (Non‑Prop)
- Top 20 Risks
- Climate change exposure
- UW Limit
- Risk Profile
- Large Loss List
- Large Loss Triangulation
- Cat Loss List
- Triangulation
- Cresta Zone Control
- Submit

### Data Tabs (Casualty order)
- Client Details
- EPI Summary
- Treaty Statistics (Prop)
- Treaty Statistics (PropCC)
- Treaty Statistics (Non‑Prop)
- Rate Development
- Rate Development (Motor Specific)
- Max UW Limit Development
- Number of Risks Development
- Risk Profile
- Top 20 Risks
- Motor Fleet List
- Large Loss List
- Large Loss Triangulation
- Aggregate Triangulation
- CAT Loss Triangulation
- Cresta Zone Control
- Submit

### Paste from Excel
- Use the Paste modal to paste rows directly from Excel.
- Step‑by‑step:
  1) Click “Paste from Excel”.
  2) In Excel, select the range (headers optional) and copy.
  3) Paste into the modal textarea.
  4) Review the preview; ensure headers/columns align. Numbers may include commas as thousand separators and decimals. The parser never splits numbers like “1,200.00”.
  5) Confirm to import; data fills the table and autosaves shortly after.
- Large pastes are saved in chunks; if you hit limits, paste smaller batches.
- Casualty tabs: Import/Export CSV is removed; use Paste from Excel.
- Top 20 Risks: exactly 20 rows are kept. Pasting more than 20 rows will ignore extras; Export is hidden under Casualty.
- EPI Summary: Currency column is removed in UI; USD is assumed internally for compatibility.
 - If the columns don’t match the expected count for that table, you’ll see a clear error and the Apply button will be disabled until the selection matches. Adjust your Excel range (e.g., remove extra blank columns) and paste again.

### EPI Summary specifics
- Treaty Type is read‑only and comes from Client Details; changes there update rows automatically.
- No default “Surplus” row is pre‑added; use Add Row or paste to populate.
- EPI table and GWP Split both support paste from Excel; verify totals after paste.

### Autosave and Submit
- Autosave runs as you edit fields; a subtle status shows last saved time or any error.
- Use the Submit tab when your dataset is complete. Submitting marks the submission and triggers report generation.

## Tips & Best Practices

- Use modern browsers and keep one tab open during data entry.
- Prefer dropdown options to ensure standardized values; use “Other” only when necessary.
- Enter dates using the provided date pickers to avoid format errors.
- For bulk data, paste smaller batches if you encounter validation issues.
- Watch inline validation messages to correct issues early.

## Troubleshooting

- I can’t log in
  - Verify your email/password and that your account is provisioned. If SSO is required, ensure you’re using the correct identity.
- My changes aren’t saving
  - Check your network connection. If an error appears in the save status, wait a moment and try editing the field again.
- I don’t see a tab I expect
  - Confirm the correct Line of Business is selected. Some steps are specific to Property or Casualty.
- The “Lines of Business” list is empty
  - Select a Class of Business first; the Lines list is dependent on it.
- Paste/import is failing
  - Ensure the pasted columns match the expected order and formats. Try pasting fewer rows to isolate errors.
  - If Top 20 Risks: only 20 rows are allowed; trim your selection before pasting.
  - If EPI Summary: confirm Treaty Type in Client Details; rows will inherit it automatically.
  - Strip currency symbols before pasting (commas are fine); currency isn’t editable in EPI Summary UI.

- I changed Treaty Type but EPI rows didn’t update
  - Go to Client Details, update Treaty Type, then return to EPI Summary; rows reflect the new value.

## Support & Contact

- Email: support@example.com (replace with your organization’s support address)
- Internal chat/Teams channel: Your project channel (if applicable)
- Documentation: See the Features list in docs/FEATURES.md for capabilities and scope

If you need assistance beyond the above, reach out to your administrator or support contact for help provisioning access or diagnosing issues.
