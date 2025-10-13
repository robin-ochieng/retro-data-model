# UW Limit Table Formatting Implementation

**Phase**: 5 of 5  
**Status**: ✅ Complete  
**Date**: January 2025  
**Component**: `src/pages/wizard/steps/property/StepUwLimit.tsx`

## Executive Summary

Implemented professional number formatting for the UW Limit table in the Property LOB wizard step. The Limits column now displays numbers with thousands separators (1,500,000.00) in view mode while allowing unformatted editing with support for negatives and decimals. Risk Code remains plain text with automatic trimming. Excel paste support handles various numeric formats including commas, decimals, negatives, and spaces.

## Requirements

### User Story
As an underwriter entering UW limit data, I need:
1. **Limits column**: Display with thousands separators, edit raw numbers (including negatives and decimals)
2. **Risk Code column**: Plain text input with automatic space trimming on commit
3. **Auto-sizing**: Columns fit content with horizontal scroll when needed
4. **Excel paste**: Robust parsing that handles numbers with/without commas, decimals, negatives, and extra spaces

### Acceptance Criteria
- ✅ Limits display as "1,500,000.00" in view mode
- ✅ Limits edit mode shows raw "1500000" without formatting
- ✅ Limits support negative numbers and decimals
- ✅ Risk Code remains plain text input
- ✅ Risk Code automatically trims leading/trailing spaces on change
- ✅ Table columns auto-fit to content width
- ✅ Horizontal scroll appears when content exceeds viewport
- ✅ Excel paste parses: "1,234.56", "-8,500,000.75", "  12345  ", "1234,56" (European)
- ✅ Dynamic add/remove rows functionality maintained
- ✅ RPC autosave pattern preserved (replaces all rows atomically)
- ✅ Additional Comments field works as before
- ✅ All existing integration tests pass

## Technical Implementation

### 1. Schema Changes

**Before**:
```typescript
const RowSchema = z.object({
  risk_code: z.string().optional().default(''),
  limit: z.string().optional().default(''),
});
```

**After**:
```typescript
const RowSchema = z.object({
  risk_code: z.string().optional().default(''),
  limit: z.number().nullable().optional().default(null), // Allow negatives and decimals
});
```

**Rationale**:
- Changed from `string` to `number | null` to support NumberCell component
- Nullable to handle empty/cleared cells
- Allows negative numbers and decimals per requirements

### 2. Component Replacements

**Before**: Used `FormTable` component
```typescript
<FormTable
  columns={[
    { key: 'risk_code', label: 'Risk Code', type: 'text' },
    { key: 'limit', label: 'Limits', type: 'text' },
  ]}
  rows={rows}
  onChange={onChange}
  onRemoveRow={onRemoveRow}
  errors={errors}
  minRows={1}
/>
```

**After**: Custom table with NumberCell
```typescript
<table ref={tableRef} className={`${autoColumnClasses.table} min-w-full border rounded`}>
  <thead className={autoColumnClasses.thead}>
    <tr>
      <th className={autoColumnClasses.th}>Risk Code</th>
      <th className={autoColumnClasses.th}>Limits</th>
      <th className={autoColumnClasses.th}>Actions</th>
    </tr>
  </thead>
  <tbody>
    {rows.map((row, idx) => (
      <tr key={idx} className="align-top">
        <td className="px-2 py-1">
          <input
            type="text"
            value={row.risk_code ?? ''}
            onChange={(e) => onChange(idx, 'risk_code', e.target.value)}
            placeholder="Risk Code"
            className="px-2 py-1 border rounded w-full"
          />
        </td>
        <td className="px-2 py-1">
          <NumberCell
            value={row.limit}
            onChange={(newValue) => onChange(idx, 'limit', newValue)}
            decimals={2}
          />
        </td>
        <td className="px-2 py-1">
          <button
            onClick={() => onRemoveRow(idx)}
            disabled={rows.length === 1}
            className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Remove
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

**Rationale**:
- `FormTable` doesn't support custom cell components like `NumberCell`
- Custom table provides full control over column rendering
- Risk Code uses plain text input for flexibility
- Limits uses NumberCell for professional number formatting

### 3. Data Flow: String ↔ Number Conversion

**Loading from Database** (string → number):
```typescript
useEffect(() => {
  async function load() {
    const { data: limits } = await supabase
      .from('uw_limits')
      .select('*')
      .eq('submission_id', submissionId)
      .order('id', { ascending: true });
    
    if (limits && limits.length > 0) {
      setRows(limits.map((l: any) => ({
        risk_code: l.risk_code ?? '',
        limit: parseNumericInput((l as any).limit_value), // Parse to number
      })));
    }
  }
  load();
}, [submissionId]);
```

**Saving to Database** (number → string):
```typescript
async function handleAutosave(val: State) {
  const cleaned = (val.rows || []).map(r => ({
    risk_code: r.risk_code ?? '',
    limit: r.limit != null ? String(r.limit) : '',        // Convert to string
    limit_value: r.limit != null ? String(r.limit) : '',  // Mirror field
  }));

  await supabase.rpc('replace_uw_limits', {
    p_submission_id: submissionId,
    p_rows: cleaned,
    p_additional_comments: val.additionalComments || '',
  });
}
```

**Rationale**:
- Database stores strings for backward compatibility
- App uses numbers for NumberCell and arithmetic operations
- `parseNumericInput` handles various input formats during load
- `String()` conversion during save ensures database consistency

### 4. Excel Paste Implementation

**Before**:
```typescript
function applyGrid(grid: string[][]) {
  const mapped: Row[] = grid.map(r => ({
    risk_code: String(r[0] ?? '').trim(),
    limit: String(r[1] ?? '').trim(),  // String
  }));
  // ...
}
```

**After**:
```typescript
function applyGrid(grid: string[][]) {
  // Auto-detect header row
  let start = 0;
  if (grid.length > 0) {
    const firstRow = grid[0];
    if (firstRow.some(cell => /risk.*code/i.test(cell) || /limit/i.test(cell))) {
      start = 1; // Skip header
    }
  }
  
  const mapped: Row[] = grid.slice(start).map(r => ({
    risk_code: String(r[0] ?? '').trim(),
    limit: parseNumericInput(r[1]),  // Parse to number
  }));
  
  const cleaned = mapped.filter(m =>
    (m.risk_code?.length ?? 0) > 0 || m.limit != null
  );
  
  setRows(cleaned.length ? cleaned : [{ risk_code: '', limit: null }]);
}
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

**Rationale**:
- Robust parsing handles various Excel/international formats
- Auto-detects and skips header rows
- Filters out completely empty rows
- Maintains at least one row (UI requirement)

### 5. Risk Code Trimming

**Implementation**:
```typescript
const onChange = (idx: number, key: keyof Row, value: any) => {
  const copy = rows.slice();
  if (key === 'risk_code') {
    // Trim spaces on change
    (copy[idx] as any)[key] = typeof value === 'string' ? value.trim() : value;
  } else {
    (copy[idx] as any)[key] = value;
  }
  setRows(copy);
  setErrors(prev => ({ ...prev, [idx]: validateRow(copy[idx] as Row) }));
};
```

**Behavior**:
- User types: `"  ABC  "` → saves as `"ABC"`
- Trimming happens on every change event
- Prevents trailing/leading spaces in database

### 6. Auto-Sizing Implementation

**Setup**:
```typescript
import {
  useAutoColumnSize,
  autoColumnClasses,
} from '../../../../components/table/useAutoColumnSize';

function StepUwLimit() {
  const tableRef = useAutoColumnSize(); // Hook sets up ResizeObserver
  
  return (
    <div className="overflow-x-auto w-full">
      <table
        ref={tableRef}
        className={`${autoColumnClasses.table} min-w-full border rounded`}
      >
        {/* ... */}
      </table>
    </div>
  );
}
```

**Features**:
- Columns automatically size to fit content
- Minimum column widths prevent crushing
- Horizontal scroll appears when table exceeds container width
- Responsive to content changes (dynamic)

## Database Schema

### Tables Used

**`uw_limits`** (main data):
```sql
CREATE TABLE uw_limits (
  id SERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  risk_code TEXT,
  limit_value TEXT,           -- Stored as string
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

**`uw_limit_meta`** (additional comments):
```sql
CREATE TABLE uw_limit_meta (
  submission_id TEXT PRIMARY KEY,
  additional_comments TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### RPC Function

**`replace_uw_limits`**:
```sql
CREATE OR REPLACE FUNCTION replace_uw_limits(
  p_submission_id TEXT,
  p_rows JSONB,
  p_additional_comments TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Delete existing rows
  DELETE FROM uw_limits WHERE submission_id = p_submission_id;
  
  -- Insert new rows
  INSERT INTO uw_limits (submission_id, risk_code, limit_value)
  SELECT 
    p_submission_id,
    (r->>'risk_code')::TEXT,
    (r->>'limit')::TEXT              -- Extracts 'limit' key
  FROM jsonb_array_elements(p_rows) AS r;
  
  -- Upsert metadata
  INSERT INTO uw_limit_meta (submission_id, additional_comments)
  VALUES (p_submission_id, p_additional_comments)
  ON CONFLICT (submission_id) 
  DO UPDATE SET additional_comments = EXCLUDED.additional_comments;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

**Key Points**:
- Atomic replace: deletes old rows, inserts new ones in one transaction
- RPC extracts `r->>'limit'` (not `limit_value`) from JSON
- Additional comments stored in separate meta table

## Component Dependencies

### Imported Components
```typescript
import { NumberCell } from '../../../../components/table/NumberCell';
import {
  useAutoColumnSize,
  autoColumnClasses,
} from '../../../../components/table/useAutoColumnSize';
```

### Utilities
```typescript
import {
  parseNumericInput,
  formatNumberDisplay,
} from '../../../../lib/numberFormat';
```

### NumberCell Features
- **View Mode**: Displays formatted number with thousands separators
  - Example: `1500000` → `"1,500,000.00"`
  - Grey text for zero/null values
  - Right-aligned for numerical readability
- **Edit Mode**: Raw number input without commas
  - Example: Edit `"1,500,000.00"` → shows `"1500000"`
  - Supports negatives: `-8500000`
  - Supports decimals: `1234.56`
  - Input validation with error feedback
- **Keyboard Navigation**:
  - `Enter`: Commit changes
  - `Escape`: Cancel and revert
  - `Tab`: Move to next cell

### useAutoColumnSize Hook
- Attaches `ResizeObserver` to table
- Calculates optimal column widths based on content
- Applies responsive CSS classes
- Handles dynamic content changes

## Testing

### Test File
`tests/wizard/steps/UwLimit.db.test.tsx`

### Test Cases

#### Test 1: Autosave and Persistence
```typescript
it('autosaves row edit and reloads persisted data', async () => {
  // 1. Enter risk code
  await user.type(riskCodeInput, 'RC-001');
  
  // 2. Click NumberCell to edit limit
  await user.click(limitCell);
  
  // 3. Enter numeric value
  await user.clear(limitInput);
  await user.type(limitInput, '1500000');
  await user.keyboard('{Enter}');
  
  // 4. Verify autosave called RPC
  expect(spies.rpc).toHaveBeenCalledWith('replace_uw_limits', ...);
  
  // 5. Verify database stores as string
  expect(row.limit_value).toBe('1500000');
  
  // 6. Remount and verify data persists
  renderStep('UW-A1');
  expect(formattedCells).toContain('1,500,000');
});
```

#### Test 2: Rapid Navigation Flush
```typescript
it('flushes on rapid navigation before debounce elapses', async () => {
  // 1. Edit data quickly
  await user.type(riskCodeInput, 'RC-FAST');
  await user.type(limitInput, '850000');
  
  // 2. Immediately navigate away (triggers unmount flush)
  renderStep('UW-A2');
  
  // 3. Verify data was saved despite rapid navigation
  expect(row.limit_value).toBe('850000');
});
```

### Test Updates Required
- Changed from text input interaction to NumberCell click-and-edit pattern
- Updated assertions to expect numeric string values in database
- Fixed multiple render handling in remount scenarios

### All Tests Pass ✅
```
 ✓ tests/wizard/steps/UwLimit.db.test.tsx (2)
   ✓ UW Limit autosave & persistence (relational) (2)
     ✓ autosaves row edit and reloads persisted data
     ✓ flushes on rapid navigation before debounce elapses

 Test Files  1 passed (1)
      Tests  2 passed (2)
```

## User Experience

### Workflow Example

**Scenario**: Underwriter enters two UW limits

1. **Add First Row**:
   - Risk Code: Type `"  RC-001  "` → auto-trims to `"RC-001"`
   - Limits: Click cell → enter `1500000` → shows `"1,500,000.00"`

2. **Add Second Row**:
   - Click "Add Row" button
   - Risk Code: `"RC-002"`
   - Limits: Enter `-500000.50` → shows `"-500,000.50"` (negative with decimals)

3. **Excel Paste**:
   - Copy from Excel:
     ```
     Risk Code    Limits
     RC-003       2,500,000.00
     RC-004       -1,234,567.89
     ```
   - Click "Paste from Excel"
   - Paste → auto-detects header → parses numbers → displays formatted

4. **Auto-save**:
   - Every edit triggers autosave after 900ms debounce
   - Timestamp updates: "Saved 14:32:18"
   - Navigate away → flushes immediately (no data loss)

### Visual Design

**View Mode** (before edit):
```
┌─────────────┬──────────────────┬─────────┐
│ Risk Code   │ Limits           │ Actions │
├─────────────┼──────────────────┼─────────┤
│ RC-001      │     1,500,000.00 │ Remove  │
│ RC-002      │      -500,000.50 │ Remove  │
│ RC-003      │     2,500,000.00 │ Remove  │
└─────────────┴──────────────────┴─────────┘
```

**Edit Mode** (clicking Limits cell):
```
┌─────────────┬──────────────────┬─────────┐
│ Risk Code   │ Limits           │ Actions │
├─────────────┼──────────────────┼─────────┤
│ RC-001      │ [1500000     ] ← │ Remove  │  // Raw input
│ RC-002      │      -500,000.50 │ Remove  │
│ RC-003      │     2,500,000.00 │ Remove  │
└─────────────┴──────────────────┴─────────┘
```

## Files Modified

### Primary File
- **`src/pages/wizard/steps/property/StepUwLimit.tsx`**
  - Schema: Changed limit from string to number | null
  - Imports: Added NumberCell, useAutoColumnSize, parseNumericInput
  - Table: Replaced FormTable with custom implementation
  - Risk Code: Plain text input with trimming
  - Limits: NumberCell with decimals=2
  - Data loading: Parse strings to numbers
  - Excel paste: Parse with parseNumericInput
  - Autosave: Convert numbers to strings
  - Auto-sizing: Added tableRef and wrapper

### Test File
- **`tests/wizard/steps/UwLimit.db.test.tsx`**
  - Updated interaction pattern for NumberCell
  - Changed assertions to expect numeric strings in database
  - Fixed multiple render handling

### Documentation
- **`docs/UW_LIMIT_FORMATTING.md`** (this file)

## Reusable Components (Unchanged)

These components were created in previous phases and reused here:

1. **`src/components/table/NumberCell.tsx`**
   - Editable cell for numeric values
   - View/edit mode toggle
   - Keyboard navigation
   - Validation and error handling

2. **`src/components/table/useAutoColumnSize.ts`**
   - ResizeObserver-based auto-sizing
   - Responsive column widths
   - Horizontal scroll support

3. **`src/lib/numberFormat.ts`**
   - `parseNumericInput()`: Parse various number formats
   - `formatNumberDisplay()`: Format with thousands separators
   - `formatNumberForEdit()`: Raw number for editing
   - International format support

## Edge Cases Handled

### 1. Empty/Null Values
- Empty limit cell displays greyed "0"
- Parses as `null` internally
- Saves as empty string `""` to database

### 2. Negative Numbers
- Fully supported: `-8500000` → `"-8,500,000.00"`
- Parses correctly from Excel: `"-1,234.56"` → `-1234.56`

### 3. Decimal Numbers
- Supported up to arbitrary precision: `1234.567890`
- Display decimals configurable (default: 2)
- Example: `1234.567` → `"1,234.57"` (rounded)

### 4. Large Numbers
- No limit on magnitude
- Format: `1234567890123` → `"1,234,567,890,123.00"`
- Parses with commas: `"1,234,567,890,123.00"` → `1234567890123`

### 5. Invalid Inputs
- Non-numeric text shows validation error
- User cannot commit invalid data
- Example: Type `"abc"` → red border + error message

### 6. Excel Paste Edge Cases
- **Header row**: Auto-detects and skips
- **Empty rows**: Filtered out
- **Mixed formats**: `"1,234.56"` and `"1234.56"` both work
- **European format**: `"1234,56"` → `1234.56`
- **Currency symbols**: `"$1,234.56"` → `1234.56`
- **Extra spaces**: `"  1234  "` → `1234`

### 7. Dynamic Row Management
- Minimum 1 row enforced
- Add row creates `{ risk_code: '', limit: null }`
- Remove last row disabled
- Paste replaces all rows (or keeps 1 empty row if paste is empty)

## Performance Considerations

### Debounced Autosave
```typescript
const [state, setState] = useState<State>({ rows: [], additionalComments: '' });

useAutosave(state, async (val) => {
  await handleAutosave(val);
}, { debounceMs: 900 });
```
- 900ms debounce prevents excessive RPC calls
- Unmount triggers immediate flush (no data loss)
- Visual feedback: "Saved HH:MM:SS" timestamp

### Auto-Sizing Performance
- `ResizeObserver` efficiently tracks content changes
- Minimal re-renders (only when dimensions change)
- No manual calculation overhead

### Number Parsing Optimization
- `parseNumericInput` uses regex (fast)
- `Intl.NumberFormat` for display (browser-optimized)
- No heavy computation on render

## Comparison with Previous Phases

### Similar to Treaty Statistics & Top 20 Risks
- Uses same `NumberCell` component
- Same `useAutoColumnSize` hook
- Same `parseNumericInput` utility
- Same auto-sizing pattern
- Same Excel paste pattern

### Unique to UW Limit
- **Mixed column types**: Risk Code (text) + Limits (number)
- **Risk Code trimming**: Automatic space removal
- **Schema complexity**: String in DB ↔ number in app
- **RPC function**: Atomic replace pattern
- **Meta table**: Additional comments in separate table
- **Dynamic rows**: User can add/remove (min 1 row)

## Known Limitations

1. **Database stores strings**: Requires conversion on load/save
   - **Why**: Backward compatibility with existing data
   - **Mitigation**: Robust parsing with `parseNumericInput`

2. **No inline validation for Risk Code**: Accepts any text
   - **Why**: Risk codes vary by organization
   - **Mitigation**: Trimming prevents accidental spaces

3. **Minimum 1 row required**: Cannot delete last row
   - **Why**: UX requires at least one editable row
   - **Mitigation**: Delete button disabled on last row

4. **No duplicate detection**: Same risk code allowed multiple times
   - **Why**: Business logic may allow duplicates
   - **Future**: Add optional unique constraint if needed

## Future Enhancements

### Potential Improvements
1. **Risk Code validation**: Optional regex pattern validation
2. **Duplicate detection**: Warn if risk code appears twice
3. **Bulk edit**: Select multiple rows and edit at once
4. **Import/Export**: CSV/JSON file support beyond clipboard
5. **Audit trail**: Track who changed what and when
6. **Undo/Redo**: History stack for edit operations
7. **Sorting**: Click column headers to sort
8. **Filtering**: Search/filter rows by risk code or limit range

### Database Migration Considerations
If migrating from string to number storage:
```sql
-- Future migration (example)
ALTER TABLE uw_limits ALTER COLUMN limit_value TYPE NUMERIC USING limit_value::NUMERIC;
```
- Current code would need minimal changes (remove String() conversion)
- Benefits: Native database numeric operations, better indexing

## Lessons Learned

### What Worked Well
- Reusing components from previous phases saved significant time
- Custom table provided full control for mixed column types
- Robust parsing handles real-world Excel variations
- ResizeObserver-based auto-sizing is reliable and performant

### Challenges Overcome
- `FormTable` incompatible with `NumberCell` → built custom table
- String/number type mismatch → conversion layer in load/save
- Test failures → updated tests to match NumberCell interaction pattern
- Multiple renders in tests → used `findAllBy*` and indexed last element

### Best Practices Applied
- Type safety: Zod schema validation
- Separation of concerns: NumberCell, useAutoColumnSize as reusable utilities
- Atomic updates: RPC function replaces all rows in one transaction
- User feedback: Visual "Saved" timestamp, validation errors
- Accessibility: ARIA labels, keyboard navigation

## Conclusion

The UW Limit table formatting implementation successfully meets all requirements:
- ✅ Professional number formatting with thousands separators
- ✅ Raw number editing with negative/decimal support
- ✅ Plain text Risk Code with automatic trimming
- ✅ Auto-sizing columns with horizontal scroll
- ✅ Robust Excel paste handling
- ✅ Dynamic add/remove rows
- ✅ RPC-based autosave pattern
- ✅ All integration tests pass

This implementation follows established patterns from previous phases (Treaty Statistics, Top 20 Risks, Climate Exposure) while adapting to UW Limit's unique requirements (mixed column types, string/number conversion, meta table). The reusable components (`NumberCell`, `useAutoColumnSize`, `numberFormat` utilities) continue to prove their value across multiple wizard steps.

**Completion Status**: Ready for production deployment.

---

**Related Documentation**:
- Phase 1: `docs/TREATY_STATISTICS_FORMATTING.md`
- Phase 2: `docs/TREATY_STATISTICS_NONPROP_FORMATTING.md`
- Phase 3: `docs/TOP_20_RISKS_FORMATTING.md`
- Phase 4: `docs/CLIMATE_EXPOSURE_FORMATTING.md`
- Phase 5: `docs/UW_LIMIT_FORMATTING.md` (this document)
