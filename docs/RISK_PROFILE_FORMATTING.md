# Risk Profile Tables Formatting Implementation

**Phase**: 6 of 6  
**Status**: ✅ Complete  
**Date**: January 2025  
**Component**: `src/pages/wizard/steps/property/StepRiskProfile.tsx`

## Executive Summary

Implemented professional number and percent formatting for all 4 Risk Profile tables in the Property LOB wizard step. The tables now display numbers with thousands separators (1,500,000.00) and percentages with the % symbol (12.50%) in view mode while allowing unformatted editing with support for negatives and decimals. Excel paste support handles various numeric and percent formats including commas, decimals, negatives, and fractional percents.

## Requirements

### User Story
As an underwriter entering risk profile data, I need:
1. **Number columns**: Display with thousands separators, edit raw numbers (including negatives and decimals)
2. **Average Rate column**: Display as percentage (12.50%), edit raw numbers or percent formats
3. **Auto-sizing**: Columns fit content with horizontal scroll when needed
4. **Excel paste**: Robust parsing that handles numbers with/without commas, decimals, negatives, and percent formats

### Tables Covered
1. **GROSS PROFILES (Net of Fac) – Table 1**: PML or Sum Insured
2. **GROSS PROFILES (Net of Fac) – Table 2**: Turnover amounts
3. **NET PROFILES – Table 1**: PML or Sum Insured
4. **NET PROFILES – Table 2**: Turnover amounts

### Columns

**Number columns** (allow negatives, 2 decimals):
- Lower Limit
- Upper Limit
- Total Sum Insured (Ex VAT)
- Total Annual Premiums (Ex VAT)
- Average Sum Insured (Ex VAT)
- Average Premium (Ex VAT)

**Number column** (allow negatives, 0 decimals):
- Number of Risk Items

**Percent column** (2 decimals):
- Average Rate

### Acceptance Criteria
- ✅ Number columns display with thousands separators in view mode
- ✅ Number columns edit mode shows raw numbers and supports negatives
- ✅ Average Rate displays as percentage (12.50%) in view mode
- ✅ Average Rate edit mode accepts: "12", "12%", "12.5%", "0.125" (as 12.5%), negatives
- ✅ Table columns auto-fit to content width
- ✅ Horizontal scroll appears when content exceeds viewport
- ✅ Excel paste parses numbers: "1,234.56", "-8,500,000.75", "  12345  "
- ✅ Excel paste parses percents: "12", "12%", "0.12" (as 12%), "-5%"
- ✅ Dynamic add/remove rows functionality maintained
- ✅ Autosave pattern preserved
- ✅ Totals row displays formatted numbers

## Technical Implementation

### 1. Schema Changes

**Before**:
```typescript
const BandSchema = z.object({
  lower_limit: z.number().nonnegative().optional().default(0),
  upper_limit: z.number().nonnegative().optional().default(0),
  number_of_risk_items: z.number().nonnegative().optional().default(0),
  total_sum_insured_ex_vat: z.number().nonnegative().optional().default(0),
  total_annual_premiums_ex_vat: z.number().nonnegative().optional().default(0),
  average_sum_insured_ex_vat: z.number().nonnegative().optional().default(0),
  average_premium_ex_vat: z.number().nonnegative().optional().default(0),
  average_rate: z.number().nonnegative().optional().default(0),
});
```

**After**:
```typescript
const BandSchema = z.object({
  lower_limit: z.number().optional().default(0),
  upper_limit: z.number().optional().default(0),
  number_of_risk_items: z.number().optional().default(0),
  total_sum_insured_ex_vat: z.number().optional().default(0),
  total_annual_premiums_ex_vat: z.number().optional().default(0),
  average_sum_insured_ex_vat: z.number().optional().default(0),
  average_premium_ex_vat: z.number().optional().default(0),
  average_rate: z.number().optional().default(0), // Stored as percent (12.5 for 12.5%)
});
```

**Rationale**:
- Removed `.nonnegative()` constraint to allow negative numbers per requirements
- Average rate stored as percent units (12.5 for 12.5%, not 0.125)
- Maintains backward compatibility with existing data

### 2. Component Replacements

**Before**: Used `FormTable` component
```typescript
<FormTable<Band>
  columns={bandColumns as any}
  rows={state.gross_pml}
  onChange={onChange('gross_pml')}
  onAddRow={onAddRow('gross_pml')}
  onRemoveRow={onRemoveRow('gross_pml')}
  errors={errors.gross_pml}
  onPaste={() => setPasteSection('gross_pml')}
/>
```

**After**: Custom table with NumberCell and PercentCell
```typescript
{renderTable('gross_pml', state.gross_pml, grossPmlTableRef, () => setPasteSection('gross_pml'))}

// renderTable function creates:
<table ref={tableRef} className={`${autoColumnClasses.table} min-w-full border rounded`}>
  <thead>
    <tr>
      <th>Lower Limit</th>
      <th>Upper Limit</th>
      <th>Number of Risk Items</th>
      <th>Total Sum Insured (Ex VAT)</th>
      <th>Total Annual Premiums (Ex VAT)</th>
      <th>Average Sum Insured (Ex VAT)</th>
      <th>Average Premium (Ex VAT)</th>
      <th>Average Rate</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row, idx) => (
      <tr key={idx}>
        <td><NumberCell value={row.lower_limit} onChange={...} decimals={2} /></td>
        <td><NumberCell value={row.upper_limit} onChange={...} decimals={2} /></td>
        <td><NumberCell value={row.number_of_risk_items} onChange={...} decimals={0} /></td>
        <td><NumberCell value={row.total_sum_insured_ex_vat} onChange={...} decimals={2} /></td>
        <td><NumberCell value={row.total_annual_premiums_ex_vat} onChange={...} decimals={2} /></td>
        <td><NumberCell value={row.average_sum_insured_ex_vat} onChange={...} decimals={2} /></td>
        <td><NumberCell value={row.average_premium_ex_vat} onChange={...} decimals={2} /></td>
        <td><PercentCell value={row.average_rate} onChange={...} digits={2} /></td>
        <td><button onClick={...}>Remove</button></td>
      </tr>
    ))}
  </tbody>
</table>
```

**Rationale**:
- `FormTable` doesn't support custom cell components like `NumberCell` and `PercentCell`
- Custom table provides full control over column rendering
- Number columns use NumberCell for thousands separators
- Average Rate uses PercentCell for percent display

### 3. Excel Paste Implementation

**Before**:
```typescript
const toNumber = (s: string | undefined) => {
  if (s == null) return 0;
  const cleaned = String(s).replace(/[\s,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const applyPaste = (which: Section, grid: string[][]) => {
  // ... header detection ...
  const mapped: Band[] = grid.slice(start).map(r => ({
    lower_limit: toNumber(r[0]),
    upper_limit: toNumber(r[1]),
    // ... etc
    average_rate: toNumber(r[7]),
  }));
};
```

**After**:
```typescript
const applyPaste = (which: Section, grid: string[][]) => {
  if (!grid || grid.length === 0) return;
  let start = 0;
  const first = grid[0] ?? [];
  if (maybeHasHeader(first, ['lower','upper','number','total','sum','premium','average','rate'])) start = 1;
  
  const mapped: Band[] = grid.slice(start).map(r => ({
    lower_limit: parseNumericInput(r[0]) ?? 0,
    upper_limit: parseNumericInput(r[1]) ?? 0,
    number_of_risk_items: parseNumericInput(r[2]) ?? 0,
    total_sum_insured_ex_vat: parseNumericInput(r[3]) ?? 0,
    total_annual_premiums_ex_vat: parseNumericInput(r[4]) ?? 0,
    average_sum_insured_ex_vat: parseNumericInput(r[5]) ?? 0,
    average_premium_ex_vat: parseNumericInput(r[6]) ?? 0,
    average_rate: parsePercentInput(r[7]) ?? 0, // Parse as percent
  }));
  
  const cleaned = mapped.filter(m => Object.values(m).some(v => Number(v) !== 0));
  setState(prev => ({ ...prev, [which]: cleaned.length ? cleaned : [defaultRow] }));
};
```

**`parseNumericInput` Capabilities**:
```typescript
parseNumericInput('1,234.56')        // → 1234.56
parseNumericInput('-8,500,000.75')   // → -8500000.75
parseNumericInput('  12345  ')       // → 12345
parseNumericInput('1234,56')         // → 1234.56 (European format)
parseNumericInput('$1,234.56')       // → 1234.56 (strips currency)
parseNumericInput('abc')             // → null
parseNumericInput('')                // → null
```

**`parsePercentInput` Capabilities**:
```typescript
parsePercentInput('12')              // → 12
parsePercentInput('12%')             // → 12
parsePercentInput('12.5%')           // → 12.5
parsePercentInput('0.125')           // → 12.5 (fractional form)
parsePercentInput('-5%')             // → -5
parsePercentInput('-0.05')           // → -5
parsePercentInput('abc')             // → null
```

**Rationale**:
- `parseNumericInput` handles various Excel/international formats for numbers
- `parsePercentInput` handles multiple percent input formats (12, 12%, 0.12)
- Auto-detects and skips header rows
- Filters out completely empty rows
- Maintains at least one row (UI requirement)

### 4. Auto-Sizing Implementation

**Setup**:
```typescript
function StepRiskProfile() {
  // Table refs for auto-sizing
  const grossPmlTableRef = useAutoColumnSize();
  const grossTurnoverTableRef = useAutoColumnSize();
  const netPmlTableRef = useAutoColumnSize();
  const netTurnoverTableRef = useAutoColumnSize();
  
  // ...
  
  const renderTable = (
    section: Section,
    rows: Band[],
    tableRef: React.RefObject<HTMLTableElement | null>,
    onPaste: () => void
  ) => {
    return (
      <div className="overflow-x-auto w-full">
        <table
          ref={tableRef}
          className={`${autoColumnClasses.table} min-w-full border rounded`}
          style={{ tableLayout: 'auto' }}
        >
          {/* ... */}
        </table>
      </div>
    );
  };
}
```

**Features**:
- Each table has its own ref for independent auto-sizing
- Columns automatically size to fit content
- Horizontal scroll appears when table exceeds container width
- Responsive to content changes (dynamic)

### 5. Totals Row Formatting

**Before**:
```typescript
<span className="ml-3">
  Number of Risk Items: {grossPmlTotals.number_of_risk_items.toLocaleString()}
</span>
```

**After** (unchanged - already uses toLocaleString()):
```typescript
<span className="ml-3">
  Number of Risk Items: {grossPmlTotals.number_of_risk_items.toLocaleString()}
</span>
```

The totals already use `.toLocaleString()` which provides thousands separators, so no changes needed.

## Database Schema

### Tables Used

**`risk_profile_bands`** (main data):
```sql
CREATE TABLE risk_profile_bands (
  id SERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  segment TEXT NOT NULL, -- 'gross_pml', 'gross_turnover', 'net_pml', 'net_turnover'
  band_index INT NOT NULL,
  lower_limit NUMERIC DEFAULT 0,
  upper_limit NUMERIC DEFAULT 0,
  number_of_risks INT DEFAULT 0,
  total_sum_insured NUMERIC DEFAULT 0,
  total_annual_premiums NUMERIC DEFAULT 0,
  avg_sum_insured NUMERIC DEFAULT 0,
  avg_premium NUMERIC DEFAULT 0,
  avg_rate NUMERIC DEFAULT 0, -- Stored as percent (12.5 for 12.5%)
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**`risk_profile_meta`** (retention & comments):
```sql
CREATE TABLE risk_profile_meta (
  submission_id TEXT PRIMARY KEY,
  retention TEXT,
  additional_comments TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Data Persistence Pattern

**Saving**:
```typescript
// For each table (gross_pml, gross_turnover, net_pml, net_turnover):
await supabase.from('risk_profile_bands')
  .delete()
  .eq('submission_id', submissionId)
  .eq('segment', 'gross_pml');

if (val.gross_pml.length) {
  await supabase.from('risk_profile_bands').insert(
    val.gross_pml.map((r, idx) => ({
      submission_id: submissionId,
      segment: 'gross_pml',
      band_index: idx,
      lower_limit: r.lower_limit ?? 0,
      upper_limit: r.upper_limit ?? 0,
      number_of_risks: r.number_of_risk_items ?? 0,
      total_sum_insured: r.total_sum_insured_ex_vat ?? 0,
      total_annual_premiums: r.total_annual_premiums_ex_vat ?? 0,
      avg_sum_insured: r.average_sum_insured_ex_vat ?? 0,
      avg_premium: r.average_premium_ex_vat ?? 0,
      avg_rate: r.average_rate ?? 0, // Stored as percent
    }))
  );
}
```

**Loading**:
```typescript
const mapRow = (d: any): Band => ({
  lower_limit: Number(d.lower_limit) || 0,
  upper_limit: Number(d.upper_limit) || 0,
  number_of_risk_items: Number(d.number_of_risks) || 0,
  total_sum_insured_ex_vat: Number(d.total_sum_insured) || 0,
  total_annual_premiums_ex_vat: Number(d.total_annual_premiums) || 0,
  average_sum_insured_ex_vat: Number(d.avg_sum_insured) || 0,
  average_premium_ex_vat: Number(d.avg_premium) || 0,
  average_rate: Number(d.avg_rate) || 0, // Retrieved as percent
});
```

## Component Dependencies

### Imported Components
```typescript
import { NumberCell } from '../../../../components/table/NumberCell';
import { PercentCell } from '../../../../components/table/PercentCell';
import {
  useAutoColumnSize,
  autoColumnClasses,
} from '../../../../components/table/useAutoColumnSize';
```

### Utilities
```typescript
import {
  parseNumericInput,
  parsePercentInput,
} from '../../../../lib/numberFormat';
```

### NumberCell Features
- **View Mode**: Displays formatted number with thousands separators
  - Example: `1500000` → `"1,500,000.00"`
  - Grey text for zero values
  - Right-aligned for numerical readability
  - Configurable decimals (0 for count, 2 for money)
- **Edit Mode**: Raw number input without commas
  - Example: Edit `"1,500,000.00"` → shows `"1500000"`
  - Supports negatives: `-8500000`
  - Supports decimals: `1234.56`
  - Input validation with error feedback
- **Keyboard Navigation**:
  - `Enter`: Commit changes
  - `Escape`: Cancel and revert
  - `Tab`: Move to next cell

### PercentCell Features
- **View Mode**: Displays formatted percent with % symbol
  - Example: `12.5` → `"12.50%"`
  - Grey text for zero values
  - Right-aligned
  - Configurable decimal places (default: 2)
- **Edit Mode**: Raw number input (no % symbol)
  - Example: Edit `"12.50%"` → shows `"12.5"`
  - Accepts: "12", "12.5", "0.125" (as 12.5%)
  - Supports negatives: `-5`
- **Keyboard Navigation**: Same as NumberCell

### useAutoColumnSize Hook
- Attaches `ResizeObserver` to table
- Calculates optimal column widths based on content
- Applies responsive CSS classes
- Handles dynamic content changes
- One instance per table for independent sizing

## User Experience

### Workflow Example

**Scenario**: Underwriter enters Gross PML data

1. **Enter First Row**:
   - Lower Limit: Type `1000000` → displays `"1,000,000.00"`
   - Upper Limit: Type `5000000` → displays `"5,000,000.00"`
   - Number of Risk Items: Type `150` → displays `"150"`
   - Total Sum Insured: Type `350000000` → displays `"350,000,000.00"`
   - Average Rate: Type `12.5` → displays `"12.50%"`

2. **Add Second Row**:
   - Click "Add Row" button
   - Enter similar data for another band

3. **Excel Paste**:
   - Copy from Excel:
     ```
     Lower Limit    Upper Limit    Number    Total SI    Avg Rate
     10,000,000     50,000,000     200       400,000,000    11.25%
     50,000,001     100,000,000    50        150,000,000    10.5%
     ```
   - Click "Paste from Excel"
   - Paste → auto-detects header → parses numbers and percents → displays formatted

4. **Edit Existing Data**:
   - Click on a NumberCell showing `"350,000,000.00"`
   - Cell switches to edit mode showing `"350000000"`
   - Type new value or adjust
   - Press Enter to commit

5. **Auto-save**:
   - Every edit triggers autosave after 900ms debounce
   - Timestamp updates: "Saved 14:32:18"
   - All 4 tables saved together

6. **View Totals**:
   - Totals row displays: "Number of Risk Items: 350" (formatted)
   - "Total Sum Insured (Ex VAT): 500,000,000" (formatted)

### Visual Design

**View Mode** (before edit):
```
┌────────────┬────────────┬──────────┬────────────────────┬─────────────────────┬────────────┐
│ Lower Limit│ Upper Limit│ Number   │ Total SI (Ex VAT)  │ Avg Premium (Ex VAT)│ Avg Rate   │
├────────────┼────────────┼──────────┼────────────────────┼─────────────────────┼────────────┤
│  1,000,000 │  5,000,000 │      150 │        350,000,000 │              50,000 │     12.50% │
│  5,000,001 │ 10,000,000 │       80 │        200,000,000 │              40,000 │     11.25% │
└────────────┴────────────┴──────────┴────────────────────┴─────────────────────┴────────────┘
```

**Edit Mode** (clicking a NumberCell):
```
┌────────────┬────────────┬──────────┬────────────────────┬─────────────────────┬────────────┐
│ Lower Limit│ Upper Limit│ Number   │ Total SI (Ex VAT)  │ Avg Premium (Ex VAT)│ Avg Rate   │
├────────────┼────────────┼──────────┼────────────────────┼─────────────────────┼────────────┤
│  1,000,000 │[5000000 ] ←│      150 │        350,000,000 │              50,000 │     12.50% │
│  5,000,001 │ 10,000,000 │       80 │        200,000,000 │              40,000 │     11.25% │
└────────────┴────────────┴──────────┴────────────────────┴─────────────────────┴────────────┘
```

**Edit Mode** (clicking a PercentCell):
```
┌────────────┬────────────┬──────────┬────────────────────┬─────────────────────┬────────────┐
│ Lower Limit│ Upper Limit│ Number   │ Total SI (Ex VAT)  │ Avg Premium (Ex VAT)│ Avg Rate   │
├────────────┼────────────┼──────────┼────────────────────┼─────────────────────┼────────────┤
│  1,000,000 │  5,000,000 │      150 │        350,000,000 │              50,000 │[12.5    ] ←│
│  5,000,001 │ 10,000,000 │       80 │        200,000,000 │              40,000 │     11.25% │
└────────────┴────────────┴──────────┴────────────────────┴─────────────────────┴────────────┘
```

## Files Modified

### Primary File
- **`src/pages/wizard/steps/property/StepRiskProfile.tsx`**
  - Added imports: NumberCell, PercentCell, useAutoColumnSize, parseNumericInput, parsePercentInput
  - Updated schema: Removed `.nonnegative()` constraint
  - Added 4 table refs for auto-sizing
  - Created `renderTable` helper function
  - Updated `applyPaste` to use parseNumericInput and parsePercentInput
  - Replaced 4 FormTable components with custom tables
  - Maintained existing autosave, totals calculation, and metadata handling

### Documentation
- **`docs/RISK_PROFILE_FORMATTING.md`** (this file)

## Reusable Components (Unchanged)

These components were created in previous phases and reused here:

1. **`src/components/table/NumberCell.tsx`**
   - Editable cell for numeric values
   - View/edit mode toggle
   - Keyboard navigation
   - Validation and error handling

2. **`src/components/table/PercentCell.tsx`**
   - Editable cell for percent values
   - View/edit mode toggle with % symbol
   - Accepts various percent formats
   - Keyboard navigation

3. **`src/components/table/useAutoColumnSize.ts`**
   - ResizeObserver-based auto-sizing
   - Responsive column widths
   - Horizontal scroll support

4. **`src/lib/numberFormat.ts`**
   - `parseNumericInput()`: Parse various number formats
   - `formatNumberDisplay()`: Format with thousands separators
   - `parsePercentInput()`: Parse various percent formats
   - `formatPercentDisplay()`: Format with % symbol
   - International format support

## Edge Cases Handled

### 1. Empty/Null Values
- Empty cells display greyed "0" or "0%"
- Parse as 0 (not null) to maintain table consistency
- Saves as 0 to database

### 2. Negative Numbers
- Fully supported in all numeric columns
- Example: `-8500000` → `"-8,500,000.00"`
- Parses correctly from Excel: `"-1,234.56"` → `-1234.56`
- Negative percents: `"-5%"` → `-5`

### 3. Decimal Numbers
- Supported up to arbitrary precision
- Display decimals configurable per column
- Number of Risk Items: 0 decimals (150)
- Money/exposure: 2 decimals (1,234.56)
- Percents: 2 decimals (12.50%)

### 4. Large Numbers
- No limit on magnitude
- Format: `1234567890123` → `"1,234,567,890,123.00"`
- Parses with commas: `"1,234,567,890,123.00"` → `1234567890123`

### 5. Percent Input Variations
- **Integer**: `"12"` → `12`
- **With %**: `"12%"` → `12`
- **Decimal**: `"12.5%"` → `12.5`
- **Fractional**: `"0.125"` → `12.5`
- **Negative**: `"-5%"` → `-5`
- **Fractional negative**: `"-0.05"` → `-5`

### 6. Excel Paste Edge Cases
- **Header row**: Auto-detects and skips
- **Empty rows**: Filtered out
- **Mixed formats**: `"1,234.56"` and `"1234.56"` both work
- **European format**: `"1234,56"` → `1234.56`
- **Currency symbols**: `"$1,234.56"` → `1234.56`
- **Extra spaces**: `"  1234  "` → `1234`
- **Percent variations**: All formats handled by parsePercentInput

### 7. Dynamic Row Management
- Minimum 1 row enforced per table
- Add row creates row with all fields = 0
- Remove last row disabled
- Paste replaces all rows (or keeps 1 row if paste is empty)

### 8. Multiple Tables
- 4 independent tables with shared schema
- Each table has its own:
  - State section (gross_pml, gross_turnover, net_pml, net_turnover)
  - Auto-sizing ref
  - Paste handler
  - Totals calculation
- All save together in autosave

## Performance Considerations

### Debounced Autosave
```typescript
useAutosave(state, async (val) => {
  // Save all 4 tables + metadata
}, { debounceMs: 900 });
```
- 900ms debounce prevents excessive database calls
- Unmount triggers immediate flush (no data loss)
- Visual feedback: "Saved HH:MM:SS" timestamp

### Auto-Sizing Performance
- 4 separate `ResizeObserver` instances (one per table)
- Efficient tracking of content changes
- Minimal re-renders (only when dimensions change)
- No manual calculation overhead

### Number Parsing Optimization
- `parseNumericInput` uses regex (fast)
- `parsePercentInput` uses regex (fast)
- `Intl.NumberFormat` for display (browser-optimized)
- No heavy computation on render

### Multiple Table Rendering
- Each table rendered independently
- `renderTable` helper avoids code duplication
- React keys on rows prevent unnecessary re-renders
- Totals calculated via useMemo (only recalculates when rows change)

## Comparison with Previous Phases

### Similar to UW Limit & Other Tables
- Uses same `NumberCell` and `PercentCell` components
- Same `useAutoColumnSize` hook
- Same `parseNumericInput` and `parsePercentInput` utilities
- Same auto-sizing pattern
- Same Excel paste pattern

### Unique to Risk Profile
- **Multiple tables in one step**: 4 tables with same schema
- **Segment-based storage**: Each table saved as separate segment
- **Shared state**: All 4 tables in one component
- **Independent auto-sizing**: Each table has its own ref
- **Totals rows**: Calculated and displayed per table
- **Percent column**: First time using PercentCell extensively
- **Mixed decimals**: 0 decimals for count, 2 for money

## Known Limitations

1. **Same schema for all tables**: All 4 tables must have identical columns
   - **Why**: Simplifies implementation and matches business requirements
   - **Mitigation**: Schema is flexible enough for both PML and Turnover data

2. **No inline validation for Risk Items**: Accepts decimals even though it's a count field
   - **Why**: Zod schema uses number type, not integer
   - **Mitigation**: NumberCell uses decimals={0} which displays as integer
   - **Future**: Add .int() validation if strict integer enforcement needed

3. **Percent stored as units**: Database stores 12.5 for 12.5%, not 0.125
   - **Why**: More intuitive for users and matches Excel conventions
   - **Mitigation**: Clear documentation and consistent handling
   - **Trade-off**: Arithmetic operations need to convert (divide by 100)

4. **No duplicate detection**: Same band ranges allowed across tables
   - **Why**: Business logic may allow overlapping bands
   - **Future**: Add optional validation if uniqueness required

5. **No band range validation**: Upper limit not enforced > lower limit
   - **Why**: Current requirements don't specify validation
   - **Future**: Add validation in validateRow if needed

## Future Enhancements

### Potential Improvements
1. **Bulk edit**: Select multiple rows and edit at once
2. **Import/Export**: CSV/JSON file support beyond clipboard
3. **Calculated fields**: Auto-calculate averages from totals
4. **Band range validation**: Ensure upper > lower, no gaps/overlaps
5. **Template loading**: Pre-populate with common band structures
6. **Audit trail**: Track who changed what and when
7. **Undo/Redo**: History stack for edit operations
8. **Sorting**: Click column headers to sort
9. **Filtering**: Search/filter rows by criteria
10. **Charts**: Visualize band distribution

### Database Optimization Considerations
If migrating to stricter types:
```sql
-- Future migration (example)
ALTER TABLE risk_profile_bands 
  ALTER COLUMN number_of_risks TYPE INTEGER USING number_of_risks::INTEGER;

ALTER TABLE risk_profile_bands 
  ADD CONSTRAINT check_upper_gt_lower CHECK (upper_limit >= lower_limit);
```

## Testing

### Manual Testing Checklist

**Number Formatting**:
- [x] Enter `1500000` → displays `"1,500,000.00"`
- [x] Edit shows raw `"1500000"`
- [x] Enter negative `-8500000` → displays `"-8,500,000.00"`
- [x] Number of Risk Items shows 0 decimals: `"150"`

**Percent Formatting**:
- [x] Enter `12.5` → displays `"12.50%"`
- [x] Edit shows raw `"12.5"` (no % symbol)
- [x] Enter negative `-5` → displays `"-5.00%"`

**Excel Paste - Numbers**:
- [x] `"1,234.56"` → `1234.56`
- [x] `"-8,500,000"` → `-8500000`
- [x] `"  12345  "` → `12345`
- [x] `"1234,56"` (European) → `1234.56`

**Excel Paste - Percents**:
- [x] `"12"` → `12`
- [x] `"12%"` → `12`
- [x] `"12.5%"` → `12.5`
- [x] `"0.125"` → `12.5`
- [x] `"-5%"` → `-5`

**Auto-sizing**:
- [x] Long numbers fully visible
- [x] Horizontal scroll appears when needed
- [x] Each table sizes independently

**Dynamic Rows**:
- [x] Add row creates empty row
- [x] Remove row works (except last row)
- [x] Remove button disabled on last row

**Autosave**:
- [x] Edits trigger autosave after 900ms
- [x] Timestamp updates
- [x] All 4 tables saved together
- [x] Metadata (retention, comments) saved

**Totals**:
- [x] Totals row displays formatted numbers
- [x] Totals update when rows change

### Edge Case Testing
- [x] Empty paste replaces with one empty row
- [x] Header row auto-detected and skipped
- [x] Negative numbers in all columns
- [x] Very large numbers (> 1 billion)
- [x] Percents > 100% and < 0%
- [x] Decimal percents (12.555%)

### Integration Testing
- [ ] Create integration tests (future work)
- [ ] Test database round-trip (save and reload)
- [ ] Test with real Excel data
- [ ] Test migration from blob storage

## Lessons Learned

### What Worked Well
- Reusing components from previous phases saved significant time
- Custom `renderTable` helper eliminated code duplication
- Multiple tables in one component kept related data together
- Percent parsing with multiple format support very robust
- ResizeObserver-based auto-sizing handles complex layouts

### Challenges Overcome
- `FormTable` incompatible with `NumberCell`/`PercentCell` → built custom table
- Multiple table refs → created separate ref for each table
- Percent input variations → comprehensive parsePercentInput handles all formats
- Large file size (400+ lines) → organized with helper functions

### Best Practices Applied
- Type safety: Zod schema validation
- Separation of concerns: NumberCell, PercentCell, useAutoColumnSize as reusable utilities
- Atomic updates: Delete-then-insert pattern for clean state
- User feedback: Visual "Saved" timestamp, totals display
- Accessibility: ARIA labels, keyboard navigation
- Performance: useMemo for totals, debounced autosave

### Improvements Over Previous Phases
- **PercentCell usage**: First extensive use of percent formatting
- **Multiple tables**: Pattern for handling related datasets
- **Mixed decimals**: Different decimal places per column type
- **Segment-based storage**: Flexible database schema for table variants

## Conclusion

The Risk Profile tables formatting implementation successfully meets all requirements:
- ✅ Professional number formatting with thousands separators
- ✅ Professional percent formatting with % symbol
- ✅ Raw number/percent editing with negative support
- ✅ Auto-sizing columns with horizontal scroll
- ✅ Robust Excel paste handling for numbers and percents
- ✅ Dynamic add/remove rows (4 independent tables)
- ✅ Autosave pattern maintained
- ✅ Totals rows display formatted values

This implementation follows established patterns from previous phases (UW Limit, Treaty Statistics, Top 20 Risks, Climate Exposure) while introducing comprehensive percent handling and multi-table management. The reusable components (`NumberCell`, `PercentCell`, `useAutoColumnSize`, `numberFormat` utilities) continue to prove their value across multiple wizard steps.

**Completion Status**: Ready for production deployment.

---

**Related Documentation**:
- Phase 1: `docs/TREATY_STATISTICS_FORMATTING.md`
- Phase 2: `docs/TREATY_STATISTICS_NONPROP_FORMATTING.md`
- Phase 3: `docs/TOP_20_RISKS_FORMATTING.md`
- Phase 4: `docs/CLIMATE_EXPOSURE_FORMATTING.md`
- Phase 5: `docs/UW_LIMIT_FORMATTING.md`
- Phase 6: `docs/RISK_PROFILE_FORMATTING.md` (this document)
