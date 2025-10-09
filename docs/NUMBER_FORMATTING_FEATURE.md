# Number Formatting and Excel Paste Enhancement

## Overview

This enhancement adds robust number formatting, auto-sizing columns, and Excel paste compatibility to the EPI Summary tables in the Retrocession Data Hub application.

## Implementation Date

October 9, 2025

## Components Created

### 1. Number Formatting Utility (`src/lib/numberFormat.ts`)

A comprehensive utility for handling number formatting and parsing across multiple locale formats.

**Functions:**

- `formatNumberDisplay(n, opts?)` - Formats numbers with thousands separators for display
  - Uses `Intl.NumberFormat` with Kenyan locale (en-KE)
  - Handles null/undefined/empty values gracefully
  - Customizable decimal places via options

- `parseNumericInput(raw)` - Parses numbers from various formats
  - Supports US format: `1,234.56` (comma = thousands, period = decimal)
  - Supports European format: `1.234,56` (period = thousands, comma = decimal)
  - Handles space-separated thousands: `1 234 567`
  - Auto-detects format based on separator positions
  - Excel paste compatible

- `formatNumberForEdit(n)` - Returns unformatted number string for editing

- `isValidNumericInput(raw)` - Validates if a string can be parsed as a number

**Example Usage:**
```typescript
import { formatNumberDisplay, parseNumericInput } from '../lib/numberFormat';

// Display formatting
formatNumberDisplay(8288000000) // "8,288,000,000"
formatNumberDisplay(1234.567, { maximumFractionDigits: 2 }) // "1,234.57"

// Parsing from Excel
parseNumericInput('67,000,000,000') // 67000000000
parseNumericInput('82,880,000.50') // 82880000.5
parseNumericInput('1 234 567') // 1234567
parseNumericInput('1.234,56') // 1234.56 (European format)
```

### 2. NumberCell Component (`src/components/table/NumberCell.tsx`)

A reusable editable table cell component optimized for numeric data entry.

**Features:**

- **Display Mode**: Shows formatted numbers with thousands separators
- **Edit Mode**: Raw number input without formatting (activated on click/focus)
- **Paste Support**: Handles Excel formats with automatic sanitization
- **Keyboard Navigation**: 
  - Enter: Commit changes
  - Escape: Cancel editing
  - Tab/Shift+Tab: Navigate between cells
- **Validation**: Shows inline error messages for invalid input
- **Accessibility**: Proper ARIA labels and live regions

**Props:**
```typescript
interface NumberCellProps {
  value: number | null;
  onChange: (value: number | null) => void;
  decimals?: number; // default: 2
  className?: string;
  autoFocusOnAdd?: boolean;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}
```

**Example Usage:**
```tsx
<NumberCell
  value={epiValue}
  onChange={(val) => setValue('epi_value', val ?? 0)}
  decimals={2}
  ariaLabel="EPI Value"
/>
```

### 3. Auto-Column Size Hook (`src/components/table/useAutoColumnSize.ts`)

A React hook that enables content-based column sizing for tables.

**Features:**

- Sets `table-layout: auto` for dynamic column widths
- Adds horizontal scroll container support
- Uses ResizeObserver for responsive adjustments
- Provides CSS utility classes for consistent styling

**CSS Classes:**
```typescript
{
  table: 'w-full min-w-max',
  th: 'whitespace-nowrap px-3 py-2',
  tdText: 'whitespace-normal break-words px-3 py-2',
  tdNumeric: 'whitespace-nowrap px-3 py-2 text-right',
  container: 'overflow-x-auto w-full',
}
```

**Example Usage:**
```tsx
const tableRef = useAutoColumnSize();

return (
  <div className={autoColumnClasses.container}>
    <table ref={tableRef} className={autoColumnClasses.table}>
      {/* table content */}
    </table>
  </div>
);
```

## Updated Components

### StepEpiSummary.tsx

**Changes Made:**

1. **Imports Added:**
   - `NumberCell` component
   - `useAutoColumnSize` hook and utilities
   - `parseNumericInput` function

2. **Table Structure Updates:**
   - Added `epiTableRef` and `gwpTableRef` for auto-sizing
   - Applied `autoColumnClasses` to containers and cells
   - Proper text-alignment (left for text, right for numbers)

3. **EPI Value Column:**
   - Replaced `<input type="number">` with `<NumberCell>`
   - Display mode shows formatted numbers (e.g., "8,288,000,000")
   - Edit mode allows raw input without commas
   - Watches form state for real-time updates

4. **Premium Column (GWP Split):**
   - Replaced `<input type="number">` with `<NumberCell>`
   - Same formatting and editing behavior as EPI Value

5. **Paste Handling Enhancement:**
   - Updated `toNumber()` helper to use `parseNumericInput`
   - Handles mixed formats from Excel paste
   - Accepts: `67,000,000,000`, `82,880,000.50`, `95,000,000`
   - Sanitizes before saving to database

## Testing

### Unit Tests (`tests/lib/numberFormat.test.ts`)

Comprehensive test suite with 28 test cases covering:

- **Format Display**: Thousands separators, decimals, edge cases
- **Parse Input**: US format, European format, spaces, negatives
- **Excel Compatibility**: Large numbers, mixed formats, roundtrip
- **Edge Cases**: Null/undefined, NaN, invalid input

**Test Results:**
```
✓ formatNumberDisplay (7 tests)
✓ parseNumericInput (10 tests)
✓ formatNumberForEdit (4 tests)
✓ isValidNumericInput (3 tests)
✓ Edge cases and Excel paste compatibility (4 tests)

Test Files  1 passed (1)
Tests  28 passed (28)
```

## Acceptance Criteria ✅

All acceptance criteria have been met:

1. ✅ **Thousands Separators**: Numbers display with commas (e.g., 8,288,000,000)
2. ✅ **Raw Editing**: Edit mode shows unformatted numbers without commas
3. ✅ **Auto-Fit Columns**: Tables use content-based widths, no clipping
4. ✅ **Horizontal Scroll**: Long content scrolls horizontally when needed
5. ✅ **Excel Paste**: Handles various formats:
   - `67,000,000,000` ✓
   - `82,880,000` ✓
   - `105,000,000.75` ✓
6. ✅ **Database Persistence**: Stores pure numeric values (no formatting)
7. ✅ **Validation**: Invalid input shows error messages
8. ✅ **No Layout Shift**: Formatting doesn't cause layout changes
9. ✅ **Accessibility**: ARIA labels, keyboard navigation, focus states
10. ✅ **Performance**: Formatting only on blur, not on every keystroke

## Migration Notes

### Breaking Changes
None - this is a backward-compatible enhancement.

### Data Migration
Not required - numeric values are stored the same way in the database.

### Browser Support
- Modern browsers with `Intl.NumberFormat` support
- ResizeObserver API (all modern browsers)
- Fallback formatting if Intl fails

## Performance Considerations

1. **Lazy Formatting**: Numbers only format on blur/commit, not on keystroke
2. **Memoization**: Format options are cached in Intl.NumberFormat
3. **ResizeObserver**: Efficient DOM monitoring for column sizing
4. **Debouncing**: Form autosave already debounced (900ms)

## Accessibility Features

1. **ARIA Labels**: All inputs have descriptive labels
2. **Live Regions**: Validation errors announced to screen readers
3. **Keyboard Navigation**: Full keyboard support (Tab, Enter, Escape)
4. **Focus States**: Clear visual indicators for focus
5. **Error Messages**: Associated with inputs via `aria-describedby`

## Future Enhancements

Potential improvements for future iterations:

1. **Currency Support**: Add currency prefix/suffix options
2. **Custom Locale**: Allow user to select preferred number format
3. **Copy Formatting**: Option to copy formatted vs. raw values
4. **Bulk Operations**: Select multiple cells for batch editing
5. **Undo/Redo**: Cell-level undo history

## Related Files

- `src/lib/numberFormat.ts` - Core formatting utilities
- `src/components/table/NumberCell.tsx` - Editable number cell component
- `src/components/table/useAutoColumnSize.ts` - Auto-sizing hook
- `src/pages/wizard/steps/StepEpiSummary.tsx` - Updated EPI tables
- `tests/lib/numberFormat.test.ts` - Unit tests

## References

- [Intl.NumberFormat MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat)
- [ResizeObserver MDN](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)
