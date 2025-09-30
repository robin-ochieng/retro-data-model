-- Adds export tracking columns to submissions for polling UI
begin;
alter table public.submissions
  add column if not exists export_status text check (export_status in ('queued','generating','generated','failed')),
  add column if not exists export_path text,
  add column if not exists export_signed_url text,
  add column if not exists export_generated_at timestamptz;

create index if not exists idx_submissions_export_status on public.submissions(export_status) where export_status is not null;
commit;
