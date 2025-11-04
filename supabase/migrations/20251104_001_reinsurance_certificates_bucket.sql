-- Create reinsurance_certificates table to store metadata
create table if not exists public.reinsurance_certificates (
  id bigint primary key generated always as identity,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size bigint,
  content_type text,
  uploaded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.reinsurance_certificates enable row level security;

-- RLS Policies: Users can only access their own certificates
create policy "Users can view their own reinsurance certificates"
  on public.reinsurance_certificates
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own reinsurance certificates"
  on public.reinsurance_certificates
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own reinsurance certificates"
  on public.reinsurance_certificates
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own reinsurance certificates"
  on public.reinsurance_certificates
  for delete
  using (auth.uid() = user_id);

-- Create index for faster lookups
create index if not exists idx_reinsurance_certificates_submission_id 
  on public.reinsurance_certificates(submission_id);

create index if not exists idx_reinsurance_certificates_user_id 
  on public.reinsurance_certificates(user_id);

-- Create the storage bucket
insert into storage.buckets (id, name, public)
values ('reinsurance_certificates', 'reinsurance_certificates', false)
on conflict (id) do nothing;

-- Storage Policies: Secure user-specific access
-- Users can upload files to their own folder (user_id/submission_id/*)
create policy "Users can upload their own reinsurance certificates"
  on storage.objects
  for insert
  with check (
    bucket_id = 'reinsurance_certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read files from their own folder
create policy "Users can read their own reinsurance certificates"
  on storage.objects
  for select
  using (
    bucket_id = 'reinsurance_certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update files in their own folder
create policy "Users can update their own reinsurance certificates"
  on storage.objects
  for update
  using (
    bucket_id = 'reinsurance_certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'reinsurance_certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete files from their own folder
create policy "Users can delete their own reinsurance certificates"
  on storage.objects
  for delete
  using (
    bucket_id = 'reinsurance_certificates'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
