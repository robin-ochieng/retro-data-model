-- MANUAL SCHEMA FIX FOR SUPABASE DASHBOARD
-- Run this SQL directly in your Supabase SQL Editor to fix the epi_gwp_split table schema

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'epi_gwp_split' 
  AND table_schema = 'public';

-- Step 2: Drop existing primary key constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.epi_gwp_split'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.epi_gwp_split DROP CONSTRAINT epi_gwp_split_pkey;
  END IF;
END$$;

-- Step 3: Drop the bigserial id column if it exists
ALTER TABLE public.epi_gwp_split DROP COLUMN IF EXISTS id;

-- Step 4: Add the correct uuid id column with default
ALTER TABLE public.epi_gwp_split ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;

-- Step 5: Set it as primary key
ALTER TABLE public.epi_gwp_split ADD CONSTRAINT epi_gwp_split_pkey PRIMARY KEY (id);

-- Step 6: Ensure position column exists for ordering
ALTER TABLE public.epi_gwp_split ADD COLUMN IF NOT EXISTS position int;

-- Step 7: Drop any remaining unique constraints on (submission_id, section) 
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.epi_gwp_split'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.epi_gwp_split DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END$$;

-- Step 8: Verify the fix
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'epi_gwp_split' 
  AND table_schema = 'public';