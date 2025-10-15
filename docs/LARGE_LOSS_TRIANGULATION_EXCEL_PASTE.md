# Large Loss Triangulation - Excel Paste & Number/Date Formatting

**Date**: 2025-10-15  
**Status**: ✅ Complete  
**Feature**: Excel Paste + Number/Date Formatting for Large Loss Triangulation Tab

---

## Overview

Implemented comprehensive Excel paste functionality and number/date formatting for the "Large Loss Triangulation" tab in the Property LOB wizard. The tab contains 4 tables:
1. **Loss Header** - Main loss information with year, description, date, threshold, claim number, and status
2. **Development Grid — Paid** - Payment development over time
3. **Development Grid — Reserved** - Reserve development over time
4. **Development Grid — Incurred** - Auto-calculated (Paid + Reserved)

---

## Features Implemented

### ✅ 1. Format & Parsing Utilities (`src/lib/formatUtils.ts`)

Created comprehensive utility functions for handling numeric, date, and year inputs:

#### `formatNumberDisplay(value)`
- Formats numbers with locale-specific comma grouping
- Handles decimals (max 2 decimal places)
- Handles negative numbers
- Returns empty string for null/undefined

**Examples**:
```typescript
formatNumberDisplay(1500250.75) // "1,500,250.75"
formatNumberDisplay(-1000) // "-1,000"
formatNumberDisplay(null) // ""
```

#### `parseNumericInput(raw)`
- Parses numeric input from Excel or user input
- Removes commas, spaces
- Supports negative numbers and decimals
- Returns `null` for invalid input

**Examples**:
```typescript
parseNumericInput("1,500,250.75") // 1500250.75
parseNumericInput("-50000.50") // -50000.50
parseNumericInput("1 500 000") // 1500000
parseNumericInput("abc") // null
```

#### `parseYearInput(raw)`
- Validates 4-digit years between 1900-2100
- Removes commas (handles Excel formatting like "2,024")
- Returns `null` for invalid years

**Examples**:
```typescript
parseYearInput("2023") // 2023
parseYearInput("2,024") // 2024
parseYearInput("23") // null (too short)
parseYearInput("1899") // null (out of range)
```

#### `parseDateInput(raw)`
- Parses multiple date formats:
  - Excel serial dates (e.g., 44927 → 2023-01-01)
  - ISO format: YYYY-MM-DD
  - European: DD/MM/YYYY, DD-MM-YYYY
  - US: MM/DD/YYYY
- Returns ISO date string (YYYY-MM-DD) or `null`

**Examples**:
```typescript
parseDateInput(44927) // "2023-01-01" (Excel serial)
parseDateInput("15/06/2023") // "2023-06-15"
parseDateInput("20-07-2024") // "2024-07-20"
parseDateInput("2025-08-25") // "2025-08-25"
parseDateInput("invalid") // null
```

#### Validation Functions
- `validateDate(value)` - Returns error message or null
- `validateYear(value)` - Returns error message or null
- `validateNumeric(value)` - Returns error message or null

---

### ✅ 2. Triangulation Table Component (`src/components/TriangulationTable.tsx`)

Created specialized table component for development grids with:

**Features**:
- **Formatted Display**: Numbers show with commas in view mode
- **Editable Raw Values**: On focus, displays raw numeric value for editing
- **Auto-sizing Columns**: `table-layout: auto` with proper text wrapping
- **Excel Paste Support**: "Paste from Excel" button integrated
- **Read-only Mode**: For auto-calculated Incurred grid
- **Column Totals**: Display formatted sums at top of each grid
- **Proper Alignment**: Text wraps naturally, numbers right-aligned

**Props**:
```typescript
{
  title: string;
  columns: Column[];
  rows: Record<string, any>[];
  onChange: (idx: number, key: string, value: any) => void;
  onRemoveRow?: (idx: number) => void;
  onPaste?: () => void;
  readonly?: boolean;
  totals?: number[];
}
```

---

### ✅ 3. Enhanced FormTable Component

Updated `src/components/FormTable.tsx` to support:
- `table-layout: auto` for better column sizing
- Text columns: `whitespace-normal break-words` (allows wrapping)
- Numeric columns: `whitespace-nowrap` (single-line)
- All inputs: `w-full min-w-0` (flexible sizing)
- Proper vertical alignment: `align-top` on all rows

---

### ✅ 4. Updated Step Component (`src/pages/wizard/steps/property/StepLargeLossTriangulation.tsx`)

Enhanced with:

#### Loss Header Table
- **Excel Paste**: Full TSV parsing with proper column mapping
- **Year Parsing**: Uses `parseYearInput()` for 4-digit validation
- **Date Parsing**: Uses `parseDateInput()` for multiple formats + Excel serials
- **Threshold Parsing**: Uses `parseNumericInput()` for comma-separated values
- **Text Columns**: Loss Description, Claim/Policy No., Status preserved as-is
- **Blank Row Filtering**: Skips empty trailing rows automatically

**Paste Format** (TSV):
```
Year	Description	Date	Threshold	Claim No	Status
2023	Fire damage	44927	1,500,000.50	CLM-001	Open
2024	Flood loss	01/06/2024	2500000	CLM-002	Settled
```

#### Development Grids (Paid & Reserved)
- **Excel Paste**: Full numeric grid parsing
- **Number Formatting**: Display with commas, edit raw values
- **Comma/Decimal Support**: Handles "1,500.50" format
- **Negative Numbers**: Properly parsed and displayed
- **Auto-sizing**: Columns expand to fit content
- **Totals Display**: Shows formatted sum for each month column

**Paste Format** (TSV):
```
100000	200000	300000	400000	500000	600000	700000
150000	250000	350000	450000	550000	650000	750000
```

#### Incurred Grid (Auto-calculated)
- **Read-only**: No paste button on table itself
- **Auto-calculation**: Incurred = Paid + Reserved
- **Real-time Updates**: Recalculates when Paid or Reserved changes
- **Same Formatting**: Displays numbers with commas

---

### ✅ 5. Enhanced Paste Modal Logic

Updated paste handling to:
1. Filter blank rows automatically
2. Route to correct table based on `pasteTarget` state
3. Parse Loss Header with proper type conversions:
   - Column 0 → Year (4-digit validation)
   - Column 1 → Description (text)
   - Column 2 → Date (multiple formats + Excel serial)
   - Column 3 → Threshold (numeric with comma support)
   - Column 4 → Claim/Policy No. (text)
   - Column 5 → Status (text, default "Open")
4. Parse Development Grids with numeric conversion
5. Prevent pasting into Incurred grid (shows alert)
6. Auto-create header rows when pasting grids with more rows than headers

---

## Test Coverage

### ✅ Format Utils Tests (`tests/lib/formatUtils.test.tsx`)

**25 tests - All Passing**:

1. **formatNumberDisplay (4 tests)**
   - ✅ Format numbers with commas
   - ✅ Handle decimals correctly
   - ✅ Handle negative numbers
   - ✅ Return empty string for null/undefined

2. **parseNumericInput (6 tests)**
   - ✅ Parse numbers with commas
   - ✅ Parse negative numbers
   - ✅ Parse decimals
   - ✅ Handle spaces
   - ✅ Return null for empty/invalid
   - ✅ Handle numbers passed as numbers

3. **parseYearInput (4 tests)**
   - ✅ Parse valid 4-digit years
   - ✅ Handle years with commas (from Excel)
   - ✅ Reject invalid years
   - ✅ Return null for empty/invalid

4. **parseDateInput (5 tests)**
   - ✅ Parse Excel serial dates
   - ✅ Parse ISO format (YYYY-MM-DD)
   - ✅ Parse DD/MM/YYYY format
   - ✅ Parse DD-MM-YYYY format
   - ✅ Return null for invalid dates

5. **validateDate (2 tests)**
   - ✅ Return null for valid dates
   - ✅ Return error message for invalid dates

6. **validateYear (2 tests)**
   - ✅ Return null for valid years
   - ✅ Return error message for invalid years

7. **validateNumeric (2 tests)**
   - ✅ Return null for valid numbers
   - ✅ Return error message for invalid numbers

**Test Results**:
```
✓ tests/lib/formatUtils.test.tsx (25)
Test Files  1 passed (1)
Tests  25 passed (25)
Duration  1.82s
```

---

## Files Created/Modified

### Created:
1. **`src/lib/formatUtils.ts`** (214 lines)
   - All parsing and formatting utility functions

2. **`src/components/TriangulationTable.tsx`** (142 lines)
   - Specialized table component for development grids

3. **`tests/lib/formatUtils.test.tsx`** (167 lines)
   - Comprehensive test suite for utilities

### Modified:
1. **`src/pages/wizard/steps/property/StepLargeLossTriangulation.tsx`**
   - Added imports for format utils
   - Enhanced paste modal logic with proper parsing
   - Integrated TriangulationTable component
   - Improved column definitions

2. **`src/components/FormTable.tsx`**
   - Added `table-layout: auto` style
   - Enhanced cell classes for proper wrapping
   - Added `min-w-0` to inputs for flexible sizing

---

## Usage Examples

### Pasting into Loss Header

**Excel Data**:
| UW Year | Description | Date of Loss | Threshold | Claim No | Status |
|---------|-------------|--------------|-----------|----------|--------|
| 2023 | Fire damage | 44927 | 1,500,000.50 | CLM-001 | Open |
| 2024 | Flood loss | 01/06/2024 | 2,500,000 | CLM-002 | Settled |

**Result**:
- Year: `2023`, `2024` (validated as 4-digit)
- Date: `2023-01-01`, `2024-06-01` (converted to ISO)
- Threshold: `1500000.5`, `2500000` (parsed as numbers)

### Pasting into Development Grids

**Excel Data** (Paid):
| 12m | 24m | 36m | 48m | 60m | 72m | 84m |
|-----|-----|-----|-----|-----|-----|-----|
| 100,000 | 200,000 | 300,000 | 400,000 | 500,000 | 600,000 | 700,000 |
| 150,000 | 250,000 | 350,000 | 450,000 | 550,000 | 650,000 | 750,000 |

**Result**:
- Values stored as: `100000`, `200000`, `300000`, etc.
- Displayed as: `100,000`, `200,000`, `300,000`, etc.
- Editable as raw numbers: `100000`

**Excel Data** (Reserved):
| 12m | 24m | 36m | 48m | 60m | 72m | 84m |
|-----|-----|-----|-----|-----|-----|-----|
| 50,000 | 100,000 | 150,000 | 200,000 | 250,000 | 300,000 | 350,000 |

**Incurred (Auto-calculated)**:
| 12m | 24m | 36m | 48m | 60m | 72m | 84m |
|-----|-----|-----|-----|-----|-----|-----|
| 150,000 | 300,000 | 450,000 | 600,000 | 750,000 | 900,000 | 1,050,000 |

---

## Technical Details

### CSS Classes Applied

**Table**:
- `table-layout: auto` - Allows columns to size based on content
- `min-w-full` - Full width when possible
- `overflow-x-auto` - Horizontal scroll when needed

**Text Columns**:
- `td`: `whitespace-normal break-words` - Allows natural wrapping
- `input`: `w-full min-w-0` - Flexible sizing

**Numeric Columns**:
- `td`: `whitespace-nowrap text-right` - Single-line, right-aligned
- `input`: `w-full min-w-0 text-right` - Right-aligned editing

**All Cells**:
- `align-top` - Consistent vertical alignment

### Auto-calculation Logic

```typescript
// Recompute incurred whenever paid or reserved changes
const computedIncurred = headers.map((_, r) => 
  devMonths.map((_, c) => 
    (gridPaid[r]?.[c] ?? 0) + (gridReserved[r]?.[c] ?? 0)
  )
);
setGridIncurred(computedIncurred);
```

### Date Storage Format

All dates stored in ISO format (YYYY-MM-DD) in Supabase:
```typescript
date_of_loss: parseDateInput(rawDate) || null
```

Supported input formats converted to ISO:
- Excel serial: `44927` → `"2023-01-01"`
- European: `"15/06/2023"` → `"2023-06-15"`
- Dash format: `"20-07-2024"` → `"2024-07-20"`
- ISO (pass-through): `"2025-08-25"` → `"2025-08-25"`

---

## Build Status

```
✓ npm run build - SUCCESS
✓ All TypeScript checks passed
✓ No compilation errors
✓ 25/25 tests passing
```

**Build Output**:
```
vite v4.5.14 building for production...
✓ 1836 modules transformed.
dist/index.html                         0.89 kB
dist/assets/index-da3b339f.css         51.02 kB
dist/assets/index-0c1bb2c6.js         682.82 kB
✓ built in 5.35s
```

---

## Acceptance Criteria Status

### ✅ Loss Header
- [x] Pastes directly from Excel (TSV format)
- [x] Year validates as 4-digit (1900-2100)
- [x] Dates auto-parse from multiple formats + Excel serials
- [x] Dates save as ISO format (YYYY-MM-DD)
- [x] Threshold formatted as numeric with grouping (commas)
- [x] Text columns fully visible, wrap naturally
- [x] Blank trailing rows skipped automatically

### ✅ Development Grids (Paid & Reserved)
- [x] Numbers show comma-grouped format in view
- [x] Raw editable values in edit mode (on focus)
- [x] Paste supports negative numbers
- [x] Paste supports decimal numbers
- [x] Columns auto-fit, no clipping
- [x] Data autosaves to Supabase
- [x] Totals row displays formatted sums

### ✅ Incurred Grid
- [x] Auto-calculated only (no paste button on table)
- [x] Same formatting as other grids (commas in display)
- [x] Updates in real-time when Paid or Reserved changes
- [x] Read-only mode enforced

---

## Known Limitations

1. **Date Ambiguity**: For dates like "01/02/2024", system assumes DD/MM/YYYY (European format) over MM/DD/YYYY (US format)

2. **Excel Serial Date Range**: Only handles dates after 1900-01-01 (Excel epoch limitation)

3. **Number Precision**: Display rounds to 2 decimal places, but full precision stored

4. **Column Count**: Development grids currently default to 7 columns (12, 24, 36, 48, 60, 72, 84 months). "Add 12m" button adds columns.

---

## Future Enhancements

- [ ] Add validation error UI indicators (red borders, error messages)
- [ ] Add CSV export functionality for all tables
- [ ] Add column customization (add/remove/rename columns)
- [ ] Add bulk validation before save (flag all errors at once)
- [ ] Add paste preview modal (show parsed data before applying)
- [ ] Add undo/redo functionality for paste operations

---

**End of Documentation**
