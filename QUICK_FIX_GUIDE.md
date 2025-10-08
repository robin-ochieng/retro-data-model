# 🚀 QUICK START: Fix Home Page Not Showing Submissions

## ⚡ TL;DR
Run `db/FIX_OWNER_ID_AND_RLS.sql` in Supabase SQL Editor → Test creating a submission → Verify it shows on Home page

---

## 📋 Step-by-Step Instructions

### 1️⃣ Run Diagnostic (Optional but Recommended)
1. Open Supabase Dashboard → SQL Editor
2. Copy/paste contents of `db/CHECK_CURRENT_STATE.sql`
3. Click "Run"
4. Review results to see current state

### 2️⃣ Apply the Fix (REQUIRED)
1. In Supabase SQL Editor, open `db/FIX_OWNER_ID_AND_RLS.sql`
2. Copy/paste the entire file
3. Click "Run"
4. ✅ Wait for "Success" message (should take ~1-2 seconds)

### 3️⃣ Test the Application
1. Open/refresh the app in your browser
2. Open DevTools Console (F12)
3. Go to Home page
4. Fill in Client (e.g., "Test Client") and Year (e.g., 2025)
5. Click "Start Property" or "Start Casualty"
6. Wizard should open ✅
7. Navigate back to Home (click logo)
8. **NEW SUBMISSION SHOULD NOW APPEAR** under "Resume recent submissions" ✅

### 4️⃣ What to Look For (Success Indicators)

**In Browser Console:**
```
[HOME] Loading recent submissions for user: <some-uuid>
[HOME] Recent submissions error: null
[HOME] Recent submissions rows: 1 [{id: "...", status: "in_progress", ...}]
```

**On Home Page:**
- Card appears under "Resume recent submissions"
- Shows your client name and year
- Shows status badge ("in_progress")
- "Resume" button works

---

## 🔍 Troubleshooting

### Problem: "Column 'owner_id' does not exist"
**Solution:** You didn't run the migration. Go back to Step 2️⃣

### Problem: Submissions still don't show
**Check:** Browser console for `[HOME]` logs
- If `error: null` and `rows: 0` → RLS policy issue, re-run migration
- If `error: {...}` → Check error message in console

**Check:** Database directly
```sql
SELECT id, user_id, owner_id, status 
FROM public.submissions 
WHERE owner_id = auth.uid()
ORDER BY created_at DESC;
```

### Problem: "Auth error" or "RLS policy violation"
**Solution:** RLS policies weren't created correctly
- Re-run `db/FIX_OWNER_ID_AND_RLS.sql`
- Verify policies exist:
```sql
SELECT policyname FROM pg_policies 
WHERE tablename = 'submissions';
```
Should see: `select_own_submissions`, `insert_own_submissions`, etc.

---

## 📁 Files Created/Modified

### Database Files (Run in Supabase)
- ✅ `db/CHECK_CURRENT_STATE.sql` - Diagnostic queries
- ✅ `db/FIX_OWNER_ID_AND_RLS.sql` - **THE FIX** (run this!)
- ✅ `supabase/migrations/20251008_001_add_owner_id_and_fix_rls.sql` - Migration for version control

### Application Files (Already Updated)
- ✅ `src/pages/Home.tsx` - Added console logging
- ✅ `src/lib/supabase.ts` - Added console logging

### Documentation
- ✅ `docs/FIX_HOME_SUBMISSIONS_NOT_SHOWING.md` - Full technical details
- ✅ `QUICK_FIX_GUIDE.md` - This file

---

## 🎯 What the Fix Does

1. **Adds `owner_id` column** to `submissions` table
2. **Backfills `owner_id`** from existing `user_id` values
3. **Creates trigger** to auto-set `owner_id = auth.uid()` on new submissions
4. **Creates trigger** to auto-update `updated_at` timestamp
5. **Replaces RLS policies** to use `owner_id` instead of `user_id`
6. **Adds indexes** for better query performance

---

## ✅ Success Checklist

- [ ] Ran `db/CHECK_CURRENT_STATE.sql` (optional)
- [ ] Ran `db/FIX_OWNER_ID_AND_RLS.sql` (required)
- [ ] Saw "Success" message in Supabase
- [ ] Refreshed the app
- [ ] Created a test submission
- [ ] Saw submission appear on Home page
- [ ] Console shows `[HOME]` logs with data
- [ ] No errors in console

---

## 📞 Still Having Issues?

1. Check `docs/FIX_HOME_SUBMISSIONS_NOT_SHOWING.md` for detailed troubleshooting
2. Run the diagnostic queries in Step 4 of that document
3. Check browser console for specific error messages
4. Verify Supabase project URL and anon key in `.env` file

---

**Estimated Time:** 5 minutes  
**Difficulty:** Easy (copy/paste SQL)  
**Impact:** High (fixes core functionality)
