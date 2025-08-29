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
  - Select the Line of Business (Property or Casualty) and step through the tabs (e.g., Client Details, EPI Summary, Treaty Statistics, etc.).
- Main workspace
  - Forms and tables for data entry with inline validation and autosave status.

## Using Core Features

### Client Details
- Country
  - Dropdown with African countries; defaults to Kenya. Choose “Other” to type a custom value.
- Currency (in std. units)
  - Dropdown of ISO 4217 codes; defaults to USD. Choose “Other” to type a custom value.
- Class of Business and Line(s) of Business
  - Class is a dropdown; Lines are dependent on the selected class. Choose “Other” to type a custom value.
- Treaty Type
  - Dropdown of common treaty types with an “Other” option.

### Data Tabs (examples)
- Property
  - EPI Summary; Treaty Statistics (Prop/Non‑Prop); UW Limit; Risk Profile; Large Loss List; Large Loss Triangulation; Triangulation; Cresta Zone Control; Top 20 Risks; Climate Exposure.
- Casualty
  - Treaty Statistics (Prop/PropCC/Non‑Prop); Rate Development (incl. Motor); Max UW Limit Development; Number of Risks Development; Large Loss List; Large Loss Triangulation; Aggregate Triangulation; CAT Loss Triangulation; Motor Fleet List.

### Paste from Excel/CSV
- Use the Paste modal (where available) to paste rows directly from Excel/CSV.
- The app parses data client‑side and autosaves in chunks for larger payloads.

### Autosave and Submit
- Autosave runs as you edit fields; a subtle status shows last saved time or any error.
- Use the Submit tab when your dataset is complete (if configured for your workflow).

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

## Support & Contact

- Email: support@example.com (replace with your organization’s support address)
- Internal chat/Teams channel: Your project channel (if applicable)
- Documentation: See the Features list in docs/FEATURES.md for capabilities and scope

If you need assistance beyond the above, reach out to your administrator or support contact for help provisioning access or diagnosing issues.
