-- ===================================================
-- FIX: line_of_business constraint to accept both cases
-- Run this in Supabase SQL Editor
-- ===================================================

-- Option 1: Keep constraint but accept both lowercase and capitalized
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_line_of_business_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_line_of_business_check 
  CHECK (line_of_business IN ('property', 'casualty', 'Property', 'Casualty'));

-- Option 2: Make it case-insensitive (recommended)
-- ALTER TABLE public.submissions 
--   DROP CONSTRAINT IF EXISTS submissions_line_of_business_check;
-- 
-- ALTER TABLE public.submissions
--   ADD CONSTRAINT submissions_line_of_business_check 
--   CHECK (LOWER(line_of_business) IN ('property', 'casualty'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'public.submissions'::regclass 
AND conname = 'submissions_line_of_business_check';
