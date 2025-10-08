# Help Page Updates

## Summary
This document outlines the updates needed for `src/pages/Help.tsx` to reflect recent changes to the application, including:
- New premium Getting Started panel on the Home page
- Enhanced COB/LOB selection and display
- Improved autosave functionality
- Quick links to resources

## Changes Required

### 1. Quick Start Section (lines 103-111)
**Replace:**
```tsx
<ol className="list-decimal pl-6 space-y-1">
  <li>Use a modern browser (Edge, Chrome, or Firefox) and sign in.</li>
  <li>Create a new submission or resume one from the Home page.</li>
  <li>Select a Line of Business (Property or Casualty) to open its tabs.</li>
  <li>Complete Client Details (Header) first; its values flow to other tabs.</li>
  <li>Enter data in each tab. Changes autosave after brief inactivity.</li>
</ol>
```

**With:**
```tsx
<ol className="list-decimal pl-6 space-y-1">
  <li>Use a modern browser (Edge, Chrome, or Firefox) and sign in.</li>
  <li>From the <strong>Home page</strong>, select a client and year to begin your submission.</li>
  <li><strong>(Optional)</strong> Choose a Class of Business preset to prefill the COB/LOB field in the wizard—you can always change it later.</li>
  <li>Click <strong>Start</strong> to create your submission and open the wizard with tabs for your selected Line of Business (Property or Casualty).</li>
  <li>Complete <strong>Client Details (Header)</strong> first; its values flow to other tabs.</li>
  <li>Enter data in each tab. Changes autosave after brief inactivity.</li>
</ol>
<Callout variant="tip">
  The Home page features a <strong>Getting Started panel</strong> with quick access to sample data, CSV templates, documentation, and support—use these resources to speed up your workflow!
</Callout>
```

### 2. Navigation Section (lines 115-121)
**Replace:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li><strong>Top bar</strong>: Branding and quick actions.</li>
  <li><strong>Left navigation</strong>: Tabs by Line of Business (Property or Casualty).</li>
  <li><strong>Main workspace</strong>: Forms and tables with inline validation and autosave.</li>
</ul>
```

**With:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li><strong>Home page</strong>: Start new submissions, resume in-progress work, and access quick resources via the Getting Started panel (Sample Data, CSV Templates, Documentation, Support).</li>
  <li><strong>Top bar</strong>: Branding, theme toggle (light/dark mode), and quick actions.</li>
  <li><strong>Left navigation (Wizard)</strong>: Tabs by Line of Business (Property or Casualty) dynamically displayed based on your submission.</li>
  <li><strong>Main workspace</strong>: Forms and tables with inline validation and autosave.</li>
</ul>
<Callout variant="info">
  The Class of Business you select on the Home page determines which Line of Business tabs appear in the wizard. Property and Casualty each have distinct tab layouts tailored to their data requirements.
</Callout>
```

### 3. Client Details (Header) Section (lines 126-134)
**Replace:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li>Country, Class of Business, and Lines: Use dropdowns; select "Other" to type a custom value.</li>
  <li>Currency (standard units): Choose the reporting currency; downstream tabs reference this.</li>
  <li>Treaty Type: Choose the appropriate structure (e.g., Proportional, Non‑Proportional).</li>
  <li>Claims Period: Enter a date range (Start and End). End must be on or after Start.</li>
</ul>
<p>
  Header values (Treaty Type, Currency, Claims Period) are saved to your submission and made available to downstream tabs.
  Where applicable, some fields appear read‑only in tables to keep entries consistent.
</p>
```

**With:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li><strong>Class of Business (COB) & Line of Business (LOB)</strong>: If you selected a COB preset on the Home page, this field will be prefilled. You can change it using the dropdown or select "Other" to type a custom value.</li>
  <li><strong>Country</strong>: Use the dropdown to select the primary country; select "Other" to type a custom value.</li>
  <li><strong>Currency (standard units)</strong>: Choose the reporting currency; downstream tabs reference this value for consistency.</li>
  <li><strong>Treaty Type</strong>: Choose the appropriate structure (e.g., Proportional, Non‑Proportional).</li>
  <li><strong>Claims Period</strong>: Enter a date range (Start and End). End must be on or after Start.</li>
</ul>
<p>
  Header values (COB/LOB, Treaty Type, Currency, Claims Period) are saved to your submission and made available to downstream tabs.
  Where applicable, some fields appear read‑only in tables to keep entries consistent.
</p>
<Callout variant="tip">
  <strong>New!</strong> The COB/LOB field now displays both the class and line (e.g., "Property - Fire" or "Casualty / Liability - General Liability") for clarity. Changing the COB updates which Line of Business tabs are available.
</Callout>
```

### 4. Tips & Best Practices Section (lines 169-175)
**Replace:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li>Use a modern browser and keep one tab open during entry.</li>
  <li>Prefer dropdown values for consistency; use "Other" only when necessary.</li>
  <li>Use the date range controls for Claims Period to avoid format errors.</li>
  <li>For large pastes, try smaller batches to isolate validation issues.</li>
  <li>If a read‑only field looks wrong, update it in the Header instead of per‑row.</li>
</ul>
```

**With:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li><strong>Use COB presets</strong>: Select a Class of Business on the Home page to prefill the COB/LOB field and save time.</li>
  <li><strong>Leverage Quick Links</strong>: The Getting Started panel on the Home page provides quick access to Sample Data, CSV Templates, Documentation, and Support.</li>
  <li>Use a modern browser and keep one tab open during entry.</li>
  <li>Prefer dropdown values for consistency; use "Other" only when necessary.</li>
  <li>Use the date range controls for Claims Period to avoid format errors.</li>
  <li>For large pastes, try smaller batches to isolate validation issues.</li>
  <li>If a read‑only field looks wrong, update it in the Header instead of per‑row.</li>
  <li><strong>Resume anytime</strong>: All changes autosave, so you can safely close the wizard and resume from the Home page later.</li>
</ul>
```

### 5. Troubleshooting Section (lines 189-196)
**Replace:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li>Cannot log in: Check credentials or SSO access; contact an admin if needed.</li>
  <li>Changes aren't saving: Check your network; wait a moment and edit again.</li>
  <li>Missing tab: Confirm the correct Line of Business is selected.</li>
  <li>Empty Lines of Business: Select a Class of Business first.</li>
  <li>Invalid date range: Ensure Claims Period End is on/after Start.</li>
  <li>Paste failing: Ensure column order/format matches the table; reduce batch size.</li>
</ul>
```

**With:**
```tsx
<ul className="list-disc pl-6 space-y-1">
  <li><strong>Cannot log in</strong>: Check credentials or SSO access; contact an admin if needed.</li>
  <li><strong>My submission isn't showing on the Home page</strong>: Refresh the page. If the issue persists, ensure you have the correct permissions and the submission was successfully created.</li>
  <li><strong>Changes aren't saving</strong>: Check your network connection; wait a moment and edit again. Autosave runs after brief inactivity.</li>
  <li><strong>Missing tabs in wizard</strong>: Confirm the correct Line of Business is selected in the Header. Property and Casualty show different tabs.</li>
  <li><strong>COB/LOB field is empty</strong>: If you didn't select a preset on the Home page, manually choose a Class of Business in the Header to populate the LOB tabs.</li>
  <li><strong>Invalid date range</strong>: Ensure Claims Period End is on or after Start.</li>
  <li><strong>Paste failing</strong>: Ensure column order/format matches the table; reduce batch size to isolate validation issues.</li>
  <li><strong>Quick links not working</strong>: Some quick links in the Getting Started panel may be placeholders; contact support if you need access to specific resources.</li>
</ul>
```

## Key Improvements

1. **Enhanced Home Page Guidance**: Added detailed instructions about the new Getting Started panel and its quick links
2. **COB/LOB Preset Feature**: Documented the optional Class of Business preset functionality on the Home page
3. **Better Navigation Context**: Clarified how LOB selection affects wizard tabs
4. **Improved Troubleshooting**: Added specific issues users might encounter with the new features
5. **Theme Toggle**: Mentioned the light/dark mode toggle in the top bar
6. **Clearer Formatting**: Used bold text to highlight key actions and features

## Implementation Notes

Due to technical issues with the automated replacement tool, these changes should be applied manually to `src/pages/Help.tsx`. The line numbers provided are approximate and based on the current file structure.
