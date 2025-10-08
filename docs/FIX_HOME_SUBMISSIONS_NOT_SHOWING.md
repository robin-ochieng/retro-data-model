# Fix: New Submissions Don't Show on Home Page

## Problem
Creating a submission from the Home page works (wizard opens, autosave functions), but the Home page sections ("Resume recent submissions" / "Submitted submissions") remain empty with "No recent submissions yet."

## Root Cause Analysis
1. **Missing `owner_id` column**: The database schema has `user_id` but the application expects `owner_id` for RLS (Row Level Security) policies
2. **Incorrect RLS policies**: Policies were filtering by `user_id = auth.uid()` instead of `owner_id = auth.uid()`
3. **No trigger to set `owner_id`**: When creating submissions, `owner_id` was never populated
4. **No `updated_at` trigger**: The `updated_at` column wasn't being maintained automatically

## Solution

### Step 1: Run Database Migration

**IMPORTANT**: You MUST run the SQL migration in your Supabase dashboard before the application will work correctly.

1. Go to your Supabase Dashboard → SQL Editor
2. Open and run `db/CHECK_CURRENT_STATE.sql` to verify the current state
3. Open and run `db/FIX_OWNER_ID_AND_RLS.sql` to apply the fixes

The migration will:
- Add `owner_id` column to `submissions` table
- Backfill `owner_id` from existing `user_id` values
- Create a trigger to automatically set `owner_id = auth.uid()` and `updated_at = now()` on insert/update
- Replace old RLS policies (using `user_id`) with new ones (using `owner_id`)
- Add performance indexes on `owner_id`, `(owner_id, status)`, and `(owner_id, created_at)`

### Step 2: Application Changes Made

1. **Added logging to Home.tsx**:
   - Console logs now show user ID, errors, and row counts for debugging
   - Logs appear in browser console with `[HOME]` prefix

2. **Added logging to createSubmission**:
   - Console logs show submission creation details
   - Logs appear with `[CREATE]` prefix

3. **Updated queries**:
   - Home page queries now include `lob_class` and `lob_line` columns
   - Queries filter by `user_id` (which will match `owner_id` after backfill)

### Step 3: Testing the Fix

After running the migration:

1. **Verify migration succeeded**:
   ```sql
   SELECT id, user_id, owner_id, status, created_at 
   FROM public.submissions 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - Check that `owner_id` column exists
   - Verify `owner_id` matches `user_id` for existing rows

2. **Test creating a new submission**:
   - Go to Home page
   - Fill in Client and Year
   - Optionally select a preset class
   - Click "Start"
   - Wizard should open

3. **Verify submission appears on Home**:
   - Navigate back to Home page (click logo or use browser back)
   - New submission should appear under "Resume recent submissions"
   - Check browser console for `[HOME]` logs showing the submission data

4. **Check console logs**:
   - Open browser DevTools (F12)
   - Look for logs like:
     ```
     [HOME] Loading recent submissions for user: <uuid>
     [HOME] Recent submissions error: null
     [HOME] Recent submissions rows: 1 [{ id: "...", ... }]
     [CREATE] Creating submission: { client: "...", year: 2025, ... }
     [CREATE] Submission created: { data: { id: "...", ... }, error: null }
     ```

### Step 4: Troubleshooting

If submissions still don't appear:

1. **Check RLS policies**:
   ```sql
   SELECT policyname, cmd, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'submissions';
   ```
   - Should see `select_own_submissions` using `(owner_id = auth.uid())`

2. **Check trigger exists**:
   ```sql
   SELECT trigger_name, event_manipulation
   FROM information_schema.triggers
   WHERE event_object_table = 'submissions';
   ```
   - Should see `trg_submissions_owner_ts` for INSERT and UPDATE

3. **Verify owner_id is set**:
   ```sql
   SELECT id, owner_id, user_id
   FROM public.submissions
   WHERE owner_id IS NULL;
   ```
   - Should return 0 rows (all should have owner_id)

4. **Check browser console**:
   - Look for errors in `[HOME]` or `[CREATE]` logs
   - Error messages will indicate specific issues (RLS, missing columns, etc.)

## Files Modified

### Database Files
- `supabase/migrations/20251008_001_add_owner_id_and_fix_rls.sql` - Migration file for version control
- `db/FIX_OWNER_ID_AND_RLS.sql` - Comprehensive fix script to run in Supabase SQL Editor
- `db/CHECK_CURRENT_STATE.sql` - Diagnostic script to check current database state

### Application Files
- `src/pages/Home.tsx` - Added console logging for debugging data fetching
- `src/lib/supabase.ts` - Added console logging for submission creation

## Migration Content Summary

```sql
-- Add owner_id column
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Backfill from user_id
UPDATE public.submissions
SET owner_id = user_id
WHERE owner_id IS NULL;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trg_submissions_set_owner_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trg_submissions_owner_ts
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_submissions_set_owner_timestamps();

-- Drop old RLS policies
DROP POLICY IF EXISTS "own submissions" ON public.submissions;

-- Create new RLS policies with owner_id
CREATE POLICY "select_own_submissions" ON public.submissions
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "insert_own_submissions" ON public.submissions
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "update_own_submissions" ON public.submissions
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Add indexes
CREATE INDEX idx_submissions_owner_id ON public.submissions(owner_id);
CREATE INDEX idx_submissions_owner_status ON public.submissions(owner_id, status);
```

## Acceptance Criteria

✅ After migration, `owner_id` column exists in `submissions` table  
✅ All existing submissions have `owner_id` populated (backfilled from `user_id`)  
✅ Trigger automatically sets `owner_id = auth.uid()` on new submissions  
✅ Trigger automatically updates `updated_at` timestamp  
✅ RLS policies use `owner_id` instead of `user_id`  
✅ Creating a submission from Home shows the card immediately  
✅ Console logs show valid user ID and no errors  
✅ Returning to Home after working in wizard shows updated submission  

## Next Steps (Optional)

After confirming the fix works:

1. **Remove console logs**: Clean up debug logging in production:
   - Remove `console.log` statements from `Home.tsx`
   - Remove `console.log` statements from `createSubmission`

2. **Consider deprecating user_id**: If you want to fully transition to `owner_id`:
   - Update TypeScript types in `src/types/supabase.ts`
   - Change Home queries to use `owner_id` instead of `user_id`
   - Update all other queries throughout the app
   - Eventually drop `user_id` column after confirming `owner_id` works everywhere

3. **Add E2E tests**: Consider adding end-to-end tests for the submission creation flow

## Notes

- This fix is backward compatible - existing submissions will continue to work
- The trigger ensures new submissions always have correct `owner_id` and `updated_at`
- RLS policies ensure users can only see their own submissions
- The migration is idempotent (safe to run multiple times)
