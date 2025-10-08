-- ===================================================
-- QUICK DIAGNOSTIC SCRIPT
-- Run this FIRST to see current database state
-- ===================================================

-- 1. Check submissions table columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'submissions'
ORDER BY ordinal_position;

-- 2. Check existing submissions (last 20)
SELECT 
  id, 
  user_id,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'submissions' 
        AND column_name = 'owner_id'
    ) THEN 'owner_id column exists'
    ELSE 'owner_id column MISSING'
  END as owner_id_status,
  line_of_business, 
  status, 
  created_at, 
  updated_at,
  meta
FROM public.submissions
ORDER BY created_at DESC
LIMIT 20;

-- 3. Check sheet_blobs (verify data is being saved)
SELECT 
  submission_id, 
  sheet_name, 
  LEFT(payload::text, 100) as payload_sample,
  updated_at
FROM public.sheet_blobs
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Check RLS policies
SELECT 
  policyname, 
  cmd, 
  LEFT(qual::text, 50) as using_clause,
  LEFT(with_check::text, 50) as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'submissions'
ORDER BY policyname;

-- 5. Check if triggers exist
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'submissions';
