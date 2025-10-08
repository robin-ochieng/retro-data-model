# COMPLETE FIX: "submissions_line_of_business_check" Constraint Violation

## Problem Summary
When trying to create a new submission, you were getting TWO errors:
1. ❌ `"Could not find the 'lob_class' column of 'submissions' in the schema cache"`
2. ❌ `"new row for relation "submissions" violates check constraint "submissions_line_of_business_check""`

## Root Cause
1. **Missing columns**: `lob_class` and `lob_line` columns didn't exist in the database
2. **Case mismatch**: Code was sending `'Property'` (capitalized) but database constraint only accepted `'property'` (lowercase)

## ✅ Fixes Applied

### 1. Code Fix (DONE)
Updated `src/lib/supabase.ts` to normalize `line_of_business` to lowercase:

```typescript
// Before:
const lineOfBusiness = lob_class || 'Property'; // ❌ Capitalized

// After:
let lineOfBusiness = 'property'; // ✅ Lowercase
if (lob_class) {
  const normalized = lob_class.toLowerCase();
  if (normalized.includes('casualty') || normalized.includes('liability')) {
    lineOfBusiness = 'casualty';
  }
}
```

**Mapping logic:**
- Any preset with "casualty" or "liability" → `'casualty'`
- Everything else → `'property'` (default)

### 2. Database Fixes (YOU MUST RUN)

**Option A: Run Complete Fix (RECOMMENDED)**

Open Supabase Dashboard → SQL Editor and run **`db/FIX_OWNER_ID_AND_RLS.sql`**

This fixes EVERYTHING:
- ✅ Adds `lob_class` and `lob_line` columns
- ✅ Adds `owner_id` column
- ✅ Fixes constraint to accept both cases
- ✅ Creates triggers for auto-setting owner_id
- ✅ Fixes RLS policies
- ✅ Adds performance indexes

**Option B: Quick Constraint Fix Only**

If you just want to fix the immediate error, run **`db/FIX_LOB_CONSTRAINT.sql`**:

```sql
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_line_of_business_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_line_of_business_check 
  CHECK (line_of_business IN ('property', 'casualty', 'Property', 'Casualty'));
```

### 3. Tests Created (PASSING ✅)

Created comprehensive tests in `tests/lib/createSubmission.test.ts`:

```
✓ createSubmission (7 tests)
  ✓ should create a submission with lowercase "property" by default
  ✓ should map "Property" lob_class to lowercase "property" line_of_business  
  ✓ should map "Casualty / Liability" to lowercase "casualty"
  ✓ should map "Marine & Aviation" to "property" (default)
  ✓ should handle null userId gracefully
  ✓ should set status to "in_progress"
  ✓ should include client and year in meta

Test Files  1 passed (1)
Tests  7 passed (7)
```

**All tests passing! ✨**

## What Happens Now

### Before Fix:
```typescript
// Code sends:
{
  line_of_business: 'Property',  // ❌ Capitalized
  lob_class: 'Property'          // ❌ Column doesn't exist
}

// Database constraint:
CHECK (line_of_business IN ('property','casualty'))  // ❌ Only lowercase

// Result: ❌ Constraint violation error
```

### After Fix:
```typescript
// Code sends:
{
  line_of_business: 'property',  // ✅ Lowercase
  lob_class: 'Property'          // ✅ Column exists (after migration)
}

// Database constraint (after migration):
CHECK (line_of_business IN ('property','casualty','Property','Casualty'))  // ✅ Both cases

// Result: ✅ Success!
```

## Step-by-Step: What You Need to Do

### Step 1: Run Database Migration
**REQUIRED - Pick one:**

**Option A (Recommended):** Complete fix
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste entire contents of `db/FIX_OWNER_ID_AND_RLS.sql`
3. Click "Run"
4. Wait for "Success"

**Option B:** Quick fix
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste `db/FIX_LOB_CONSTRAINT.sql`
3. Click "Run"

### Step 2: Verify the Fix
After running the migration:

1. **Check constraint:**
   ```sql
   SELECT pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conname = 'submissions_line_of_business_check';
   ```
   Should show both 'property' and 'Property' (and casualty variants)

2. **Check columns:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'submissions' 
   AND column_name IN ('lob_class', 'lob_line', 'owner_id');
   ```
   Should return 3 rows

### Step 3: Test in Browser
1. Refresh your app (Ctrl+R)
2. Go to Home page
3. Fill in client and year
4. Select a preset (e.g., "Property")
5. Click "Start"
6. **Should work!** No errors! ✨

### Step 4: Verify Console Logs
Open DevTools (F12) and you should see:
```
[CREATE] Creating submission: {client: "...", year: 2025, lob_class: "Property", lineOfBusiness: "property", ...}
[CREATE] Submission created: {data: {id: "...", status: "in_progress"}, error: null}
[HOME] Recent submissions rows: 1 [{id: "...", lob_class: "Property", ...}]
```

## Files Created/Updated

### Database Migrations
- ✅ `db/FIX_OWNER_ID_AND_RLS.sql` - Complete fix (includes constraint + columns + RLS)
- ✅ `db/FIX_LOB_CONSTRAINT.sql` - Quick constraint fix
- ✅ `db/QUICK_FIX_ADD_LOB_COLUMNS.sql` - Just adds missing columns
- ✅ `supabase/migrations/20251008_001_add_owner_id_and_fix_rls.sql` - Version control

### Code Fixes
- ✅ `src/lib/supabase.ts` - Fixed to send lowercase line_of_business

### Tests
- ✅ `tests/lib/createSubmission.test.ts` - 7 comprehensive tests (all passing)

### Documentation
- ✅ `docs/FIX_LOB_CLASS_COLUMN_ERROR.md` - Original lob_class error fix
- ✅ `RUN_THIS_FIX_NOW.md` - Quick start guide
- ✅ This file - Complete constraint violation fix

## Troubleshooting

### Still getting constraint violation error?
- Make sure you ran the SQL migration
- Check that the constraint was updated (run verification query above)
- Hard refresh browser (Ctrl+Shift+R)

### Still getting "lob_class column" error?
- Run Option A (Complete Fix) - it adds the missing columns
- Verify columns exist with the SQL query above

### Submissions created but don't show on Home?
- Run Option A (Complete Fix) - it fixes RLS policies
- Check browser console for RLS errors

### Tests failing?
```bash
npm test tests/lib/createSubmission.test.ts
```
Should show all 7 tests passing. If not, check that code changes were saved.

## Success Criteria

After running the complete fix:

- [x] Code updated to send lowercase `line_of_business` ✅
- [ ] Database migration run (YOU MUST DO THIS)
- [x] Tests created and passing (7/7) ✅
- [ ] Can create submissions without errors (after migration)
- [ ] Submissions appear on Home page (after migration)
- [ ] Console logs show success messages (after migration)

## The Fix in Action

**Creating a submission with "Property" preset:**

1. User clicks "Property" chip
2. `lob_class = 'Property'` (stored as-is for display)
3. Code converts to `line_of_business = 'property'` (lowercase for constraint)
4. Database accepts both values ✅
5. Submission created successfully ✅
6. Card displays "Property" (from lob_class) ✅

**Creating a submission with "Casualty / Liability" preset:**

1. User clicks "Casualty / Liability" chip
2. `lob_class = 'Casualty / Liability'` (stored as-is)
3. Code detects "casualty" in string → `line_of_business = 'casualty'` (lowercase)
4. Database accepts it ✅
5. Submission created ✅
6. Card displays "Casualty / Liability" ✅

## Next Step

🎯 **Go to Supabase Dashboard → SQL Editor and run the migration!**

After that, everything will work perfectly. All tests are already passing! ✨
