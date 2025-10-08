-- ===================================================
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR
-- Purpose: Add owner_id, fix RLS, and debug submissions
-- ===================================================

-- PART 1: Check current state
SELECT 
  column_name, 
  data_type, 
  is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'submissions'
ORDER BY ordinal_position;

-- PART 2: Check if any submissions exist
SELECT 
  id, 
  user_id, 
  line_of_business, 
  status, 
  created_at, 
  updated_at,
  meta
FROM public.submissions
ORDER BY created_at DESC
LIMIT 20;

-- PART 3: Add missing columns if they don't exist
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lob_class text,
  ADD COLUMN IF NOT EXISTS lob_line text;

-- PART 3b: Fix line_of_business constraint to accept both cases
ALTER TABLE public.submissions 
  DROP CONSTRAINT IF EXISTS submissions_line_of_business_check;

ALTER TABLE public.submissions
  ADD CONSTRAINT submissions_line_of_business_check 
  CHECK (line_of_business IN ('property', 'casualty', 'Property', 'Casualty'));

-- PART 4: Backfill owner_id from user_id for existing rows
UPDATE public.submissions
SET owner_id = user_id
WHERE owner_id IS NULL AND user_id IS NOT NULL;

-- PART 5: Create or replace trigger function
CREATE OR REPLACE FUNCTION public.trg_submissions_set_owner_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Set owner_id to current authenticated user if not already set
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  
  -- Set created_at if this is an insert and it's null
  IF TG_OP = 'INSERT' AND NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  
  -- Always update updated_at timestamp
  NEW.updated_at := now();
  
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 6: Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trg_submissions_owner_ts ON public.submissions;
CREATE TRIGGER trg_submissions_owner_ts
  BEFORE INSERT OR UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.trg_submissions_set_owner_timestamps();

-- PART 7: Drop old RLS policies
DROP POLICY IF EXISTS "own submissions" ON public.submissions;
DROP POLICY IF EXISTS "users can select their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "users can insert their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "users can update their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "users can delete their own submissions" ON public.submissions;

-- PART 8: Create new RLS policies using owner_id
CREATE POLICY "select_own_submissions"
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "insert_own_submissions"
  ON public.submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Trigger will set owner_id = auth.uid()

CREATE POLICY "update_own_submissions"
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "delete_own_submissions"
  ON public.submissions
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- PART 9: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_owner_id ON public.submissions(owner_id);
CREATE INDEX IF NOT EXISTS idx_submissions_owner_status ON public.submissions(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_owner_created ON public.submissions(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_lob_class ON public.submissions(lob_class);

-- Add comments for documentation
COMMENT ON COLUMN public.submissions.lob_class IS 'Class of Business (e.g., Property, Casualty, Marine & Aviation)';
COMMENT ON COLUMN public.submissions.lob_line IS 'Line of Business - more specific than lob_class';

-- PART 10: Verify the changes
SELECT 
  id, 
  user_id,
  owner_id, 
  line_of_business, 
  status, 
  created_at, 
  updated_at
FROM public.submissions
ORDER BY created_at DESC
LIMIT 10;

-- PART 11: Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'submissions';

-- ===================================================
-- DONE! 
-- After running this, test creating a new submission
-- from the Home page
-- ===================================================
