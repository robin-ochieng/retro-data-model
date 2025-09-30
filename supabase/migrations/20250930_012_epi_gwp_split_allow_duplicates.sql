-- Allow multiple rows with same section per submission for epi_gwp_split
-- Option B migration: introduce UUID primary key and optional position, remove uniqueness on (submission_id, section)
begin;

-- Add id column if missing
alter table public.epi_gwp_split add column if not exists id uuid default gen_random_uuid();
-- Add position to preserve ordering (non-unique, managed by client)
alter table public.epi_gwp_split add column if not exists position int;

-- Promote id to primary key if none exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.epi_gwp_split'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.epi_gwp_split ADD CONSTRAINT epi_gwp_split_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- Drop any unique constraints (submission_id, section)
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