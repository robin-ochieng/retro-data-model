-- Fix epi_gwp_split schema: Replace bigserial id with uuid id
-- This corrects the conflict between migrations 011 and 012
begin;

-- Drop existing primary key constraint if it exists
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

-- Drop the bigserial id column if it exists
ALTER TABLE public.epi_gwp_split DROP COLUMN IF EXISTS id;

-- Add the correct uuid id column with default
ALTER TABLE public.epi_gwp_split ADD COLUMN id uuid DEFAULT gen_random_uuid() NOT NULL;

-- Set it as primary key
ALTER TABLE public.epi_gwp_split ADD CONSTRAINT epi_gwp_split_pkey PRIMARY KEY (id);

-- Ensure position column exists for ordering
ALTER TABLE public.epi_gwp_split ADD COLUMN IF NOT EXISTS position int;

-- Drop any remaining unique constraints on (submission_id, section) 
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

commit;