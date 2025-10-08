-- Migration: Add owner_id column, update trigger, and fix RLS policies
-- Date: 2025-10-08
-- Purpose: Fix Home page not showing submissions due to missing owner_id column and incorrect RLS

-- Step 1: Add missing columns to submissions table if they don't exist
alter table public.submissions
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists lob_class text,
  add column if not exists lob_line text;

-- Step 2: Backfill owner_id from user_id for existing rows
update public.submissions
set owner_id = user_id
where owner_id is null and user_id is not null;

-- Step 3: Create or replace trigger function to automatically set owner_id and updated_at
create or replace function public.trg_submissions_set_owner_timestamps()
returns trigger as $$
begin
  -- Set owner_id to current authenticated user if not already set
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  
  -- Set created_at if this is an insert and it's null
  if TG_OP = 'INSERT' and new.created_at is null then
    new.created_at := now();
  end if;
  
  -- Always update updated_at timestamp
  new.updated_at := now();
  
  return new;
end $$ language plpgsql security definer;

-- Step 4: Drop existing trigger if it exists and create new one
drop trigger if exists trg_submissions_owner_ts on public.submissions;
create trigger trg_submissions_owner_ts
  before insert or update on public.submissions
  for each row execute function public.trg_submissions_set_owner_timestamps();

-- Step 5: Drop old RLS policies (using user_id)
drop policy if exists "own submissions" on public.submissions;
drop policy if exists "users can select their own submissions" on public.submissions;
drop policy if exists "users can insert their own submissions" on public.submissions;
drop policy if exists "users can update their own submissions" on public.submissions;
drop policy if exists "users can delete their own submissions" on public.submissions;

-- Step 6: Create new RLS policies using owner_id
-- Allow users to select their own submissions
create policy "select_own_submissions"
  on public.submissions
  for select
  to authenticated
  using (owner_id = auth.uid());

-- Allow users to insert submissions (owner_id will be set by trigger)
create policy "insert_own_submissions"
  on public.submissions
  for insert
  to authenticated
  with check (true);  -- Trigger will set owner_id = auth.uid()

-- Allow users to update their own submissions
create policy "update_own_submissions"
  on public.submissions
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Allow users to delete their own submissions
create policy "delete_own_submissions"
  on public.submissions
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- Step 7: Add indexes for better query performance
create index if not exists idx_submissions_owner_id on public.submissions(owner_id);
create index if not exists idx_submissions_owner_status on public.submissions(owner_id, status);
create index if not exists idx_submissions_owner_created on public.submissions(owner_id, created_at desc);
create index if not exists idx_submissions_lob_class on public.submissions(lob_class);

-- Step 8: Create comments for documentation
comment on column public.submissions.owner_id is 'The user who owns this submission. Set automatically by trigger to auth.uid().';
comment on column public.submissions.lob_class is 'Class of Business (e.g., Property, Casualty, Marine & Aviation)';
comment on column public.submissions.lob_line is 'Line of Business - more specific than lob_class';
comment on trigger trg_submissions_owner_ts on public.submissions is 'Automatically sets owner_id to auth.uid() and maintains updated_at timestamp';
