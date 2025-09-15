-- Large Loss List split by LOB with meta tables and legacy view

-- Property table
create table if not exists public.large_loss_list_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_id text,
  uw_year int,
  name text,
  dol date,
  type_of_loss text,
  gross_sum_insured numeric,
  gross_incurred numeric,
  paid_to_date numeric,
  gross_outstanding numeric,
  fac_amount numeric,
  net_of_fac numeric,
  surplus_cession numeric,
  qs_cession numeric,
  net_of_proportional numeric,
  xol_payment numeric,
  currency text,
  created_at timestamptz not null default now()
);
create index if not exists idx_large_loss_list_prop_submission on public.large_loss_list_prop(submission_id);

-- Casualty table
create table if not exists public.large_loss_list_cas (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  dol date,
  uw_year int,
  insured text,
  cause_of_loss text,
  incurred_fgu numeric,
  paid_fgu numeric,
  os_fgu numeric,
  fac_paid numeric,
  fac_os numeric,
  surplus_paid numeric,
  surplus_os numeric,
  qs_paid numeric,
  qs_os numeric,
  net_paid numeric,
  net_os numeric,
  currency text,
  created_at timestamptz not null default now()
);
create index if not exists idx_large_loss_list_cas_submission on public.large_loss_list_cas(submission_id);

-- Meta tables for Additional Comments
create table if not exists public.large_loss_list_meta_prop (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.large_loss_list_meta_cas (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Legacy view to avoid breaking any existing references
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema='public' and table_name='large_loss_list'
  ) then
    create or replace view public.large_loss_list_legacy as
      select * from public.large_loss_list;
  end if;
end $$;

-- Enable RLS
alter table public.large_loss_list_prop enable row level security;
alter table public.large_loss_list_cas enable row level security;
alter table public.large_loss_list_meta_prop enable row level security;
alter table public.large_loss_list_meta_cas enable row level security;

-- Policies mirroring submissions ownership
drop policy if exists large_loss_list_prop_owner_all on public.large_loss_list_prop;
drop policy if exists large_loss_list_cas_owner_all on public.large_loss_list_cas;
drop policy if exists large_loss_list_meta_prop_owner_all on public.large_loss_list_meta_prop;
drop policy if exists large_loss_list_meta_cas_owner_all on public.large_loss_list_meta_cas;

create policy large_loss_list_prop_owner_all on public.large_loss_list_prop for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_list_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_list_prop.submission_id and s.user_id = auth.uid()));

create policy large_loss_list_cas_owner_all on public.large_loss_list_cas for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_list_cas.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_list_cas.submission_id and s.user_id = auth.uid()));

create policy large_loss_list_meta_prop_owner_all on public.large_loss_list_meta_prop for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_list_meta_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_list_meta_prop.submission_id and s.user_id = auth.uid()));

create policy large_loss_list_meta_cas_owner_all on public.large_loss_list_meta_cas for all
  using (exists (select 1 from public.submissions s where s.id = large_loss_list_meta_cas.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = large_loss_list_meta_cas.submission_id and s.user_id = auth.uid()));
