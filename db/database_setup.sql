-- Create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

-- Policies: users can manage only their own profile
create policy if not exists profiles_select_own on public.profiles
for select using (id = auth.uid());

create policy if not exists profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

create policy if not exists profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile after a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Parent: one per user submission/session
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  line_of_business text check (line_of_business in ('Property','Casualty')),
  status text default 'in_progress', -- in_progress|submitted|generated|downloaded
  meta jsonb,                        -- e.g., client name, year, broker ref
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Example child tables (row sets)
create table public.large_loss_list (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  loss_date date,
  cause text,
  gross_amount numeric,
  net_amount numeric,
  currency text,
  notes text
);

create table public.cat_loss_list (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  event_name text,
  event_start date,
  event_end date,
  gross_amount numeric,
  net_amount numeric,
  notes text
);

-- Example JSON catch-alls for “single value” sheets or scattered cells
create table public.sheet_blobs (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  sheet_name text,                   -- e.g., 'EPI Summary', 'UW Limit'
  payload jsonb                      -- { "TotalEPI":12345, "UWLimit":1000000, ... }
);

-- RLS
alter table public.submissions enable row level security;
create policy "own submissions" on public.submissions
  for all using (auth.uid() = user_id);

alter table public.large_loss_list enable row level security;
create policy "child own via parent" on public.large_loss_list
  for all using (exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));

alter table public.cat_loss_list enable row level security;
create policy "child own via parent" on public.cat_loss_list
  for all using (exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));

alter table public.sheet_blobs enable row level security;
create policy "child own via parent" on public.sheet_blobs
  for all using (exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));

create table public.epi_summary (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  programme text,                  -- e.g., Quota Share
  estimate_type text,              -- e.g., Original Estimate / Revised
  period_label text,               -- e.g., '2023 - 2024'
  period_start date,               -- optional if you prefer structured dates
  period_end date,
  epi_value numeric,
  currency text default 'ZAR'
);
create index on public.epi_summary (submission_id);


-- Property
create table public.treaty_stats_prop (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  uw_year int,
  written_premium numeric,
  earned_premium numeric,
  commission_amount numeric,
  commission_pct numeric,
  profit_commission numeric,
  total_commission numeric,
  paid_losses numeric,
  os_losses numeric,
  incurred_losses numeric,
  loss_ratio numeric,
  uw_profit numeric,
  unique (submission_id, uw_year)
);

-- PropCC (Casualty combined variant with Portfolio IN/OUT)
create table public.treaty_stats_propcc (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  uw_year int,
  written_premium numeric,
  premium_portfolio_in numeric,
  premium_portfolio_out numeric,
  earned_premium numeric,
  commission numeric,
  profit_commission numeric,
  claims_paid numeric,
  claims_portfolio_in numeric,
  claims_portfolio_out numeric,
  claims_incurred numeric,
  unique (submission_id, uw_year)
);

-- Non-Prop (layer attributes)
create table public.treaty_stats_nonprop (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  treaty_year int,
  layer_limit numeric,
  layer_excess numeric,
  gnrpi numeric,
  premium_rate numeric,
  minimum_deposit_premium numeric,
  earned_premium numeric,
  reinstatement_premium numeric,
  paid_losses numeric,
  os_losses numeric,
  incurred_losses numeric,
  balance numeric,
  unique (submission_id, treaty_year)
);


create table public.risk_profile_bands (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  segment text,                   -- e.g., 'Buildings', 'Turnover', 'Panel A', 'Panel B'
  band_index int,
  lower_limit numeric,
  upper_limit numeric,
  number_of_risks numeric,
  total_sum_insured numeric,
  total_annual_premiums numeric,
  avg_sum_insured numeric,
  avg_premium numeric,
  avg_rate numeric
);
create index on public.risk_profile_bands (submission_id, segment);


alter table public.large_loss_list
  add column uw_year int,
  add column insured text,
  add column type_of_loss text,
  add column gross_sum_insured numeric,
  add column gross_incurred numeric,
  add column paid_to_date numeric,
  add column gross_outstanding numeric,
  add column fac_amount numeric,
  add column net_of_fac numeric,
  add column surplus_cession numeric,
  add column cause_of_loss text,             -- used by Casualty header
  add column fgu_incurred numeric,           -- Casualty FGU set
  add column fgu_paid numeric,
  add column fgu_os numeric,
  add column fac_paid numeric,
  add column fac_os numeric,
  add column surplus_paid numeric,
  add column surplus_os numeric,
  add column quota_share_paid numeric,
  add column quota_share_os numeric,
  add column net_paid numeric,
  add column net_os numeric;


ALTER TABLE public.cat_loss_list
  ADD COLUMN IF NOT EXISTS event_name text,
  ADD COLUMN IF NOT EXISTS event_start date,
  ADD COLUMN IF NOT EXISTS event_end date,
  ADD COLUMN IF NOT EXISTS gross_amount numeric,
  ADD COLUMN IF NOT EXISTS net_amount numeric,
  ADD COLUMN IF NOT EXISTS notes text;

-- Generic triangle values: works for Paid/Incurred/etc across multiple sheets
create table public.triangle_values (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  sheet_name text,                -- 'Triangulation', 'Aggregate Triangulation', 'CAT Loss Triangulation'
  measure text,                   -- 'paid','incurred','os','count' etc.
  origin_year int,                -- or origin_period text if needed
  dev_months int,                 -- 12, 24, 36, ...
  value numeric
);
create index on public.triangle_values (submission_id, sheet_name, measure);

-- Per-loss triangles (for "Large Loss Triangulation")
create table public.large_loss_triangle_values (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  loss_identifier text,           -- Claim/policy no or concatenated key
  uw_or_acc_year int,
  description text,
  threshold numeric,
  status text,                    -- 'Settled'/'Open'
  measure text,                   -- 'paid','reserved','incurred'
  dev_months int,
  value numeric
);
create index on public.large_loss_triangle_values (submission_id, loss_identifier, measure);

-- Generic series keyed by U/W year and a named metric
create table public.rate_development_series (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  series_name text,      -- 'Rate Development', 'Rate Development (Motor)'
  metric text,           -- 'rate_index', 'rate', etc.
  uw_year int,
  value numeric,
  unique (submission_id, series_name, metric, uw_year)
);

-- Additional development series
create table public.uw_limit_development (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  uw_year int,
  max_uw_limit numeric,
  unique (submission_id, uw_year)
);

create table public.number_of_risks_development (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  uw_year int,
  number_of_risks numeric,
  unique (submission_id, uw_year)
);

-- Because the sheet has repeated blocks (Gross/Net/QS/1st Surplus/Fac) twice,
-- model it as metric x treaty_part
create table public.motor_fleet_items (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  policy_description text,
  number_of_risks numeric,
  block text,               -- 'block1','block2' (or 'premium','claims' if you decide)
  treaty_part text,         -- 'gross','net','qs','first_surplus','fac'
  amount numeric
);
create index on public.motor_fleet_items (submission_id, policy_description);

create table public.top_risks (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  rank int,
  insured text,
  class_of_business text,
  occupation text,
  gross_sum_insured numeric,
  fac_sum_insured numeric,
  surplus_sum_insured numeric,
  quota_share_sum_insured numeric,
  net_sum_insured numeric,
  gross_premium numeric,
  fac_premium numeric,
  surplus_premium numeric,
  unique (submission_id, rank)
);


create table public.cresta_zone_aggregates (
  id bigserial primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  zone_code text,
  zone_description text,
  class_name text,             -- 'Buildings','Contents','Buildings/Contents','Motor','BI','Others'
  amount_gross_net_of_fac numeric,
  amount_net numeric
);
create index on public.cresta_zone_aggregates (submission_id, zone_code, class_name);

-- Everyone can read templates
create policy "public read templates" on storage.objects
for select using (bucket_id = 'templates');

-- Only service role can write templates (CLI, server, n8n)
create policy "svc write templates" on storage.objects
for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- generated: only service writes; owners read their own prefix user_id/
create policy "svc write generated" on storage.objects
for insert with check (bucket_id='generated' and auth.role()='service_role');

create policy "owner read generated" on storage.objects
for select using (
  bucket_id='generated'
  and split_part(name,'/',1) = auth.uid()::text
);

-- uploads: user can write/read only own prefix user_id/
create policy "user write uploads" on storage.objects
for insert with check (
  bucket_id='uploads'
  and split_part(name,'/',1) = auth.uid()::text
);

create policy "owner read uploads" on storage.objects
for select using (
  bucket_id='uploads'
  and split_part(name,'/',1) = auth.uid()::text
);

create or replace function public.get_submission_package(p_submission_id uuid)
returns jsonb
language sql security definer
set search_path = public
as $$
  select jsonb_build_object(
    'submission',      to_jsonb(s),
    'epi_summary',     (select coalesce(jsonb_agg(t), '[]'::jsonb) from epi_summary t where t.submission_id = s.id),
    'treaty_stats_prop',(select coalesce(jsonb_agg(t), '[]') from treaty_stats_prop t where t.submission_id = s.id),
    'treaty_stats_propcc',(select coalesce(jsonb_agg(t), '[]') from treaty_stats_propcc t where t.submission_id = s.id),
    'treaty_stats_nonprop',(select coalesce(jsonb_agg(t), '[]') from treaty_stats_nonprop t where t.submission_id = s.id),
    'risk_profile_bands',(select coalesce(jsonb_agg(t), '[]') from risk_profile_bands t where t.submission_id = s.id),
    'large_loss_list', (select coalesce(jsonb_agg(t), '[]') from large_loss_list t where t.submission_id = s.id),
    'cat_loss_list',   (select coalesce(jsonb_agg(t), '[]') from cat_loss_list t where t.submission_id = s.id),
    'triangle_values', (select coalesce(jsonb_agg(t), '[]') from triangle_values t where t.submission_id = s.id),
    'large_loss_triangle_values',(select coalesce(jsonb_agg(t), '[]') from large_loss_triangle_values t where t.submission_id = s.id),
    'rate_development_series',(select coalesce(jsonb_agg(t), '[]') from rate_development_series t where t.submission_id = s.id),
    'uw_limit_development',(select coalesce(jsonb_agg(t), '[]') from uw_limit_development t where t.submission_id = s.id),
    'number_of_risks_development',(select coalesce(jsonb_agg(t), '[]') from number_of_risks_development t where t.submission_id = s.id),
    'motor_fleet_items',(select coalesce(jsonb_agg(t), '[]') from motor_fleet_items t where t.submission_id = s.id),
    'top_risks',       (select coalesce(jsonb_agg(t), '[]') from top_risks t where t.submission_id = s.id),
    'cresta_zone_aggregates',(select coalesce(jsonb_agg(t), '[]') from cresta_zone_aggregates t where t.submission_id = s.id),
    'sheet_blobs',     (select coalesce(jsonb_agg(t), '[]') from sheet_blobs t where t.submission_id = s.id)
  )
  from submissions s
  where s.id = p_submission_id;
$$;

-- submissions: allow users to create their own rows
create policy "insert own submissions"
on public.submissions for insert
with check (auth.uid() = user_id);

-- children: allow insert when parent belongs to user
create policy "insert child via parent" on public.large_loss_list
for insert with check (
  exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);
create policy "insert child via parent" on public.epi_summary
for insert with check (
  exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);

-- Repeat the same INSERT policy for other child tables you’ll touch early
-- (treaty_stats_prop, risk_profile_bands, etc.)

-- submissions: allow users to create their own rows
create policy "insert own submissions"
on public.submissions for insert
with check (auth.uid() = user_id);

-- children: allow insert when parent belongs to user
create policy "insert child via parent" on public.large_loss_list
for insert with check (
  exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);
create policy "insert child via parent" on public.epi_summary
for insert with check (
  exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);

-- Repeat the same INSERT policy for other child tables you’ll touch early
-- (treaty_stats_prop, risk_profile_bands, etc.)

create policy "insert own submissions"
on public.submissions for insert
with check (auth.uid() = user_id);


create policy "insert child via parent" on public.large_loss_list
for insert with check (
  exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);


create policy "insert child via parent" on public.epi_summary
for insert with check (
  exists(select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);









