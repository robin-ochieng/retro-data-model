# View Mode Implementation Summary

## Overview
Implemented read-only View Mode for submitted submissions across all 13 wizard step components. When `submission.status === 'submitted'`, the entire wizard becomes read-only with all inputs, cells, and action buttons disabled.

## Branch
`tab-view-mode`

## Commits
1. **ed31a5b** - feat: add View Mode to EpiSummary and TreatyStatsProp
2. **e83a531** - feat: add View Mode to UwLimit, RiskProfile, TreatyStatsNonProp
3. **290a3ad** - feat: add View Mode to Top20Risks and LargeLossList
4. **3bef6e4** - feat: add View Mode to LargeLossTriangulation (prop+cas) and CatLossList
5. **d6ca390** - feat: add View Mode to CrestaZoneControl
6. **a5795f8** - feat: add View Mode to Triangulation (property) - ReinsuranceCertificate already protected

## Infrastructure Components

### 1. ViewModeContext (`src/context/ViewMode.tsx`)
- Simple boolean context provider
- Provides `useViewMode()` hook for consumption
- Wrapped around wizard content in `Wizard.tsx`

### 2. Updated Shared Components
- **FormTable** - Added `readOnly?: boolean` prop, hides Paste/Import/Add/Remove buttons
- **NumberCell** - Added `readOnly?: boolean` prop, prevents click editing
- **DateCell** - Added `readOnly?: boolean` prop, blocks double-click picker
- **PercentCell** - Added `readOnly?: boolean` prop, prevents editing
- **YearCell** - Uses `disabled?: boolean` prop (not readOnly)
- **TriangulationTable** - Uses `readonly?: boolean` prop (lowercase 'r')

## Protected Step Components (13/13)

### ✅ 1. StepHeader
- All select dropdowns disabled
- All text inputs disabled
- All textareas disabled

### ✅ 2. StepClimateExposure
- All buttons hidden (`{!isViewMode && ...}`)
- All inputs disabled
- All NumberCells readOnly

### ✅ 3. StepEpiSummary
- EPI section inputs disabled
- GWP inputs disabled
- Add/Remove/Paste buttons wrapped

### ✅ 4. StepTreatyStatsProp
- All NumberCells readOnly
- All PercentCells readOnly
- All action buttons conditionally rendered

### ✅ 5. StepUwLimit
- Text input disabled
- NumberCell readOnly
- Paste/Add Row/Remove buttons wrapped
- `additional_comments` textarea disabled

### ✅ 6. StepRiskProfile
- 4 table sections protected (gross_pml, gross_turnover, net_pml, net_turnover)
- All NumberCells and PercentCells readOnly
- Add Row/Paste buttons wrapped per section
- Retention input disabled
- `additional_comments` textarea disabled

### ✅ 7. TreatyStatsNonProp
- Year input disabled
- Layer input disabled
- All NumberCells readOnly
- Paste/Add Row/Remove buttons wrapped
- `additional_comments` textarea disabled

### ✅ 8. Top20Risks
- All NumberCells readOnly
- All text inputs disabled
- Paste button wrapped
- Export CSV button kept visible

### ✅ 9. LargeLossList
- YearCell disabled
- DateCell readOnly
- 10 NumberCells readOnly:
  - gross_sum_insured, gross_incurred, paid_to_date
  - gross_outstanding, fac_amount, net_of_fac
  - surplus_cession, qs_cession, net_of_proportional, xol_payment
- 2 text inputs disabled (name, type_of_loss)
- Paste/Add Row/Remove buttons wrapped
- `additional_comments` textarea disabled

### ✅ 10. StepLargeLossTriangulation (property)
- FormTable readOnly for headers
- 3 TriangulationTables with readonly prop (Paid, Reserved, Incurred)
- Add Row buttons wrapped (2 instances)
- Add 12m Column button wrapped

### ✅ 11. StepLargeLossTriangulation (casualty)
- FormTable readOnly for headers and dev grid
- Measure select disabled
- Add 12m button wrapped

### ✅ 12. StepCrestaZoneControl
- 2 Paste buttons wrapped (one per section)
- All NumberCells readOnly (4 instances: gross/net for complex and simple sections)
- All text inputs disabled (zone_description fields)

### ✅ 13. StepTriangulation (property)
- 4 editable tables with callbacks conditionally set to `undefined`:
  - WrittenPremiumTable
  - NumberOfLossesTable
  - PaidLossesTable
  - LossReservesTable
- Disabled callbacks:
  - onYearChange
  - onValueChange
  - onAddRow
  - onRemoveRow
  - onPaste
  - onImportCsv

### ✅ 14. StepReinsuranceCertificate
- **Already fully protected** via `isReadOnly` from SubmissionMetaContext
- Upload zone hidden when `!certificate && !isReadOnly`
- Replace/Delete buttons wrapped with `{!isReadOnly && ...}`
- Download button kept visible
- No changes needed

## Implementation Pattern

```typescript
// 1. Import hook
import { useViewMode } from '../../../../context/ViewMode';

// 2. Add hook to component
const isViewMode = useViewMode();

// 3. Disable native inputs
<input disabled={isViewMode} />
<select disabled={isViewMode} />
<textarea disabled={isViewMode} />

// 4. ReadOnly custom cells
<NumberCell readOnly={isViewMode} />
<DateCell readOnly={isViewMode} />
<PercentCell readOnly={isViewMode} />
<YearCell disabled={isViewMode} /> // Note: disabled not readOnly

// 5. Hide action buttons
{!isViewMode && <button>Paste/Add/Remove</button>}

// 6. For reusable table components
<FormTable readOnly={isViewMode} />
<TriangulationTable readonly={isViewMode} /> // Note: lowercase 'r'

// 7. For callback props (Triangulation pattern)
onCallback={isViewMode ? undefined : handleCallback}
```

## Testing Checklist

### Setup
- [ ] Select test submission or create new one
- [ ] Set `status='submitted'` in Supabase
- [ ] Reload wizard page

### Verification Steps
- [ ] Blue "Read-Only Mode" banner displays
- [ ] All text inputs are non-editable
- [ ] All dropdowns/selects don't open
- [ ] NumberCells don't enter edit mode on click
- [ ] DateCells don't show picker on double-click
- [ ] Paste buttons are hidden
- [ ] Add Row buttons are hidden
- [ ] Remove buttons are hidden
- [ ] Export/Download buttons still work
- [ ] Tab navigation works
- [ ] No autosave attempts (check Network tab)
- [ ] Console has no errors

### Test Each Component
1. Header - dropdowns, inputs, textareas
2. ClimateExposure - buttons, inputs, cells
3. EpiSummary - EPI/GWP inputs, buttons
4. TreatyStatsProp - cells, buttons
5. UwLimit - input, cell, buttons, textarea
6. RiskProfile - 4 sections, cells, buttons, retention, textarea
7. TreatyStatsNonProp - year, layer, cells, buttons, textarea
8. Top20Risks - cells, inputs, paste button
9. LargeLossList - YearCell, DateCell, 10 NumberCells, 2 inputs, buttons, textarea
10. LargeLossTriangulation (prop) - FormTable, 3 TriangulationTables, buttons
11. LargeLossTriangulation (cas) - FormTable, dev grid, measure select, button
12. CrestaZoneControl - NumberCells, inputs, paste buttons
13. Triangulation (property) - 4 tables, all callbacks disabled
14. ReinsuranceCertificate - upload zone, replace/delete buttons

### Edge Cases
- [ ] Change status back to 'draft' → verify inputs become editable
- [ ] Test with property vs casualty LOBs
- [ ] Test FormTable sections
- [ ] Test TriangulationTable sections
- [ ] Test dark mode vs light mode

## Next Steps (After Testing)

### Database-Level Protection
Add server-side enforcement as defense in depth:

```sql
-- RLS policy to prevent updates when submitted
CREATE POLICY "no_update_when_submitted" ON submissions
  FOR UPDATE USING (status <> 'submitted');

-- Prevent blob updates for submitted submissions
CREATE POLICY "no_update_blobs_when_submitted" ON sheet_blobs
  FOR UPDATE USING (
    NOT EXISTS (
      SELECT 1 FROM submissions 
      WHERE submissions.id = sheet_blobs.submission_id 
      AND submissions.status = 'submitted'
    )
  );

-- Trigger for relational tables (example pattern)
CREATE OR REPLACE FUNCTION prevent_submitted_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM submissions 
    WHERE id = NEW.submission_id 
    AND status = 'submitted'
  ) THEN
    RAISE EXCEPTION 'Cannot modify data for submitted submission';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to each relational table:
-- climate_change_exposure_rows, large_loss_list_rows, etc.
CREATE TRIGGER block_updates_when_submitted
  BEFORE UPDATE OR DELETE ON [table_name]
  FOR EACH ROW EXECUTE FUNCTION prevent_submitted_updates();
```

## Notes
- Component prop naming varies: `readOnly` vs `disabled` vs `readonly`
- YearCell uses `disabled` (not readOnly)
- TriangulationTable uses lowercase `readonly`
- ReinsuranceCertificate already protected via SubmissionMetaContext
- All exports/downloads remain functional in view mode
- No compilation errors

## Status
✅ **COMPLETE** - All 13 components protected, 6 commits pushed to `tab-view-mode` branch, ready for testing.
