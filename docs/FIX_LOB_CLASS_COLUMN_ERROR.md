# URGENT FIX: "Could not find the 'lob_class' column" Error

## Problem
Getting error: `"Could not find the 'lob_class' column of 'submissions' in the schema cache"` when trying to create a new submission.

## Immediate Solution (2 Options)

### Option 1: Quick Fix (Fastest - Only adds missing columns)
**Time: 10 seconds**

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the contents of **`db/QUICK_FIX_ADD_LOB_COLUMNS.sql`**
3. Click "Run"
4. Refresh your app
5. Try creating a submission again

**What it does:**
```sql
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS lob_class text,
  ADD COLUMN IF NOT EXISTS lob_line text;
```

### Option 2: Complete Fix (Recommended - Fixes everything)
**Time: 30 seconds**

1. Open Supabase Dashboard → SQL Editor
2. Copy/paste the **ENTIRE** contents of **`db/FIX_OWNER_ID_AND_RLS.sql`**
3. Click "Run"
4. Refresh your app
5. Try creating a submission again

**What it does:**
- Adds `lob_class` and `lob_line` columns ✅
- Adds `owner_id` column ✅
- Creates triggers for auto-setting owner_id and updated_at ✅
- Fixes RLS policies ✅
- Adds performance indexes ✅

## Why This Happened

Your code is trying to insert `lob_class` into the submissions table:

```typescript
// In src/lib/supabase.ts
.insert({
  user_id: userId ?? null,
  line_of_business: lineOfBusiness,
  status: 'in_progress',
  meta: { client, year },
  lob_class: lob_class ?? null,  // ❌ Column doesn't exist yet!
})
```

But the database table doesn't have these columns yet. The migration files were created but haven't been run on your database.

## After Running the Fix

Your submissions table will have these columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | Legacy user reference |
| `owner_id` | uuid | New owner reference (set by trigger) |
| `line_of_business` | text | Property or Casualty |
| `lob_class` | text | Class of Business (Property, Marine, etc.) |
| `lob_line` | text | Specific line within the class |
| `status` | text | in_progress, submitted, etc. |
| `meta` | jsonb | Client, year, and other metadata |
| `created_at` | timestamptz | When created |
| `updated_at` | timestamptz | Last updated (auto-maintained) |

## Verify the Fix

After running the SQL:

1. **Check columns exist:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'submissions' 
   AND column_name IN ('lob_class', 'lob_line', 'owner_id');
   ```
   Should return 3 rows.

2. **Try creating a submission:**
   - Go to Home page
   - Select client and year
   - Click "Start"
   - Should work without errors!

3. **Check browser console:**
   - Should see: `[CREATE] Submission created: { data: {...}, error: null }`
   - Should NOT see the "lob_class column" error

## If You Still Get Errors

### Error: "column 'owner_id' does not exist"
**Solution:** Run Option 2 (Complete Fix) - it adds owner_id

### Error: "Could not find the 'lob_line' column"
**Solution:** Run Option 2 (Complete Fix) - it adds both lob_class and lob_line

### Error: "permission denied"
**Check:** Make sure you're running the SQL as a superuser in Supabase SQL Editor

### Submissions still don't show on Home
**Solution:** Run Option 2 (Complete Fix) - it fixes the RLS policies

## Files Created/Updated

1. ✅ **`db/QUICK_FIX_ADD_LOB_COLUMNS.sql`** - Quick fix for immediate error
2. ✅ **`db/FIX_OWNER_ID_AND_RLS.sql`** - Complete fix (updated with lob_class/lob_line)
3. ✅ **`supabase/migrations/20251008_001_add_owner_id_and_fix_rls.sql`** - Migration file (updated)
4. ✅ **`docs/FIX_HOME_SUBMISSIONS_NOT_SHOWING.md`** - Previous documentation
5. ✅ **`db/CHECK_CURRENT_STATE.sql`** - Diagnostic script

## Next Steps

1. **Run the SQL fix** (Option 1 or 2 above)
2. **Refresh your browser**
3. **Try creating a submission**
4. **Check that it appears on Home page**

The error should be completely resolved after running either SQL script!
