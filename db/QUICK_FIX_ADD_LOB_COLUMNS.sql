-- ===================================================
-- QUICK FIX: Add missing lob_class and lob_line columns
-- Run this IMMEDIATELY in Supabase SQL Editor to fix the current error
-- ===================================================

-- Add the missing columns
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS lob_class text,
  ADD COLUMN IF NOT EXISTS lob_line text;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'submissions'
  AND column_name IN ('lob_class', 'lob_line')
ORDER BY column_name;

-- Success message
SELECT 'Columns lob_class and lob_line added successfully!' as status;
