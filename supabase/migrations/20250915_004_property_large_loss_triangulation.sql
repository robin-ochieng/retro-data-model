-- Property Large Loss Triangulation: header + split value tables
-- Header table with date_of_loss and claim_policy_no
create table if not exists public.large_loss_triangle_header_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_identifier text not null,
  uw_or_acc_year int,
  loss_description text,
  date_of_loss date,
  threshold numeric,
  claim_policy_no text,
  claim_status text,
  updated_at timestamptz not null default now()
);
create unique index if not exists uidx_large_loss_triangle_header_prop
  on public.large_loss_triangle_header_prop(submission_id, loss_identifier);
create index if not exists idx_large_loss_triangle_header_prop_submission
  on public.large_loss_triangle_header_prop(submission_id);

-- Split value tables for Paid, Reserved, Incurred
create table if not exists public.large_loss_triangle_paid_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_identifier text not null,
  development_months int not null,
  amount numeric,
  created_at timestamptz not null default now()
);
create unique index if not exists uidx_large_loss_triangle_paid_prop
  on public.large_loss_triangle_paid_prop(submission_id, loss_identifier, development_months);
create index if not exists idx_large_loss_triangle_paid_prop_submission
  on public.large_loss_triangle_paid_prop(submission_id);

create table if not exists public.large_loss_triangle_reserved_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_identifier text not null,
  development_months int not null,
  amount numeric,
  created_at timestamptz not null default now()
);
create unique index if not exists uidx_large_loss_triangle_reserved_prop
  on public.large_loss_triangle_reserved_prop(submission_id, loss_identifier, development_months);
create index if not exists idx_large_loss_triangle_reserved_prop_submission
  on public.large_loss_triangle_reserved_prop(submission_id);

create table if not exists public.large_loss_triangle_incurred_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_identifier text not null,
  development_months int not null,
  amount numeric,
  created_at timestamptz not null default now()
);
create unique index if not exists uidx_large_loss_triangle_incurred_prop
  on public.large_loss_triangle_incurred_prop(submission_id, loss_identifier, development_months);
create index if not exists idx_large_loss_triangle_incurred_prop_submission
  on public.large_loss_triangle_incurred_prop(submission_id);

-- Enable RLS
alter table public.large_loss_triangle_header_prop enable row level security;
alter table public.large_loss_triangle_paid_prop enable row level security;
alter table public.large_loss_triangle_reserved_prop enable row level security;
alter table public.large_loss_triangle_incurred_prop enable row level security;

-- Policies: owner-only based on submissions
drop policy if exists large_loss_triangle_header_prop_owner_all on public.large_loss_triangle_header_prop;
create policy large_loss_triangle_header_prop_owner_all on public.large_loss_triangle_header_prop for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_triangle_header_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_triangle_header_prop.submission_id and s.user_id = auth.uid()));

drop policy if exists large_loss_triangle_paid_prop_owner_all on public.large_loss_triangle_paid_prop;
create policy large_loss_triangle_paid_prop_owner_all on public.large_loss_triangle_paid_prop for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_triangle_paid_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_triangle_paid_prop.submission_id and s.user_id = auth.uid()));

drop policy if exists large_loss_triangle_reserved_prop_owner_all on public.large_loss_triangle_reserved_prop;
create policy large_loss_triangle_reserved_prop_owner_all on public.large_loss_triangle_reserved_prop for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_triangle_reserved_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_triangle_reserved_prop.submission_id and s.user_id = auth.uid()));

drop policy if exists large_loss_triangle_incurred_prop_owner_all on public.large_loss_triangle_incurred_prop;
create policy large_loss_triangle_incurred_prop_owner_all on public.large_loss_triangle_incurred_prop for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_triangle_incurred_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_triangle_incurred_prop.submission_id and s.user_id = auth.uid()));
