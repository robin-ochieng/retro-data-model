-- Idempotent schema and policies derived from docs/field-map*.json and docs/supabase-storage-map*.json
-- Created: 2025-09-03

-- Parent submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  line_of_business text not null check (line_of_business in ('property','casualty')),
  status text not null default 'in-progress',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

-- Flexible payload storage per sheet/tab
create table if not exists public.sheet_blobs (
  submission_id uuid not null references public.submissions(id) on delete cascade,
  sheet_name text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (submission_id, sheet_name)
);

-- EPI Summary (table-backed rows)
create table if not exists public.epi_summary (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  treaty_type text not null default 'Quota Share Treaty',
  programme text,
  estimate_type text,
  period_label text,
  epi_value numeric,
  currency text,
  created_at timestamptz not null default now()
);
create index if not exists idx_epi_summary_submission on public.epi_summary(submission_id);

-- Treaty Statistics (Prop)
create table if not exists public.treaty_stats_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  uw_year int not null,
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
  created_at timestamptz not null default now(),
  unique (submission_id, uw_year)
);
create index if not exists idx_treaty_stats_prop_submission on public.treaty_stats_prop(submission_id);

-- Risk Profile Bands
create table if not exists public.risk_profile_bands (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  segment text not null check (segment in ('gross','net')),
  band_label text,
  exposure numeric,
  premium numeric,
  claims numeric,
  frequency numeric,
  severity numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_risk_profile_bands_submission on public.risk_profile_bands(submission_id);
create index if not exists idx_risk_profile_bands_sub_segment on public.risk_profile_bands(submission_id, segment);

-- Large Loss List
create table if not exists public.large_loss_list (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_date text,
  uw_year int,
  insured text,
  cause_of_loss text,
  gross_sum_insured numeric,
  gross_incurred numeric,
  paid_to_date numeric,
  gross_outstanding numeric,
  currency text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_large_loss_list_submission on public.large_loss_list(submission_id);

-- Cat Loss List
create table if not exists public.cat_loss_list (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  event_date text,
  event_name text,
  uw_year int,
  gross_incurred numeric,
  paid_to_date numeric,
  gross_outstanding numeric,
  currency text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cat_loss_list_submission on public.cat_loss_list(submission_id);


do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'large_loss_triangle_values'
  ) then
    -- Ensure expected columns exist
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='large_loss_triangle_values' and column_name='measure'
    ) then
      alter table public.large_loss_triangle_values add column measure text;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='large_loss_triangle_values' and column_name='uw_or_acc_year'
    ) then
      alter table public.large_loss_triangle_values add column uw_or_acc_year int;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='large_loss_triangle_values' and column_name='development_months'
    ) then
      alter table public.large_loss_triangle_values add column development_months int;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='large_loss_triangle_values' and column_name='amount'
    ) then
      alter table public.large_loss_triangle_values add column amount numeric;
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='large_loss_triangle_values' and column_name='created_at'
    ) then
      alter table public.large_loss_triangle_values add column created_at timestamptz not null default now();
    end if;

    -- Recreate indexes if missing
    if not exists (
      select 1 from pg_indexes where schemaname='public' and indexname='idx_large_loss_triangle_values_submission'
    ) then
      create index idx_large_loss_triangle_values_submission
        on public.large_loss_triangle_values(submission_id);
    end if;

    if not exists (
      select 1 from pg_indexes where schemaname='public' and indexname='idx_large_loss_triangle_values_comp'
    ) then
      create index idx_large_loss_triangle_values_comp
        on public.large_loss_triangle_values(submission_id, measure, uw_or_acc_year, development_months);
    end if;

  else
    -- Fresh install path (if table truly absent)
    create table public.large_loss_triangle_values (
      id bigserial primary key,
      submission_id uuid not null references public.submissions(id) on delete cascade,
      measure text,
      uw_or_acc_year int,
      development_months int,
      amount numeric,
      created_at timestamptz not null default now()
    );
    create index idx_large_loss_triangle_values_submission on public.large_loss_triangle_values(submission_id);
    create index idx_large_loss_triangle_values_comp on public.large_loss_triangle_values(submission_id, measure, uw_or_acc_year, development_months);
  end if;
end
$$;





















-- Large Loss Triangulation (Property) values
create table if not exists public.large_loss_triangle_values (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  measure text,               -- e.g., 'paid' | 'reserved' | 'incurred'
  uw_or_acc_year int,
  development_months int,     -- 12, 24, 36, ...
  amount numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_large_loss_triangle_values_submission on public.large_loss_triangle_values(submission_id);
create index if not exists idx_large_loss_triangle_values_comp on public.large_loss_triangle_values(submission_id, measure, uw_or_acc_year, development_months);

-- Top 20 Risks
create table if not exists public.top_risks (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  rank int not null,
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
  created_at timestamptz not null default now()
);
create index if not exists idx_top_risks_submission on public.top_risks(submission_id);
create unique index if not exists uidx_top_risks_submission_rank on public.top_risks(submission_id, rank);

-- UW Limit (blob)
-- Persisted via sheet_blobs with payload fields: max_uw_limit, max_uw_limit_currency, per_risk_limit, per_event_limit, retention, additional_comments

-- Climate change exposure (blob)
-- Persisted via sheet_blobs with payload.exposures array/object per docs

-- CASUALTY-SPECIFIC tables (Motor Fleet, etc.) can be added similarly when those field maps are included in docs

-- RLS enablement
alter table public.submissions enable row level security;
alter table public.sheet_blobs enable row level security;
alter table public.epi_summary enable row level security;
alter table public.treaty_stats_prop enable row level security;
alter table public.risk_profile_bands enable row level security;
alter table public.large_loss_list enable row level security;
alter table public.cat_loss_list enable row level security;
alter table public.large_loss_triangle_values enable row level security;
alter table public.top_risks enable row level security;

-- Policies
-- Submissions: owner-only access
-- Drop existing policies if they exist
DROP POLICY IF EXISTS submissions_owner_select ON public.submissions;
DROP POLICY IF EXISTS submissions_owner_ins ON public.submissions;
DROP POLICY IF EXISTS submissions_owner_upd ON public.submissions;
DROP POLICY IF EXISTS submissions_owner_del ON public.submissions;

-- Create policies
CREATE POLICY submissions_owner_select ON public.submissions 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY submissions_owner_ins ON public.submissions 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY submissions_owner_upd ON public.submissions 
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY submissions_owner_del ON public.submissions 
  FOR DELETE USING (user_id = auth.uid());


-- Child tables: submission must belong to the caller
-- Drop existing policies if they exist
DROP POLICY IF EXISTS sheet_blobs_owner_all ON public.sheet_blobs;
DROP POLICY IF EXISTS epi_summary_owner_all ON public.epi_summary;
DROP POLICY IF EXISTS treaty_stats_prop_owner_all ON public.treaty_stats_prop;
DROP POLICY IF EXISTS risk_profile_bands_owner_all ON public.risk_profile_bands;
DROP POLICY IF EXISTS large_loss_list_owner_all ON public.large_loss_list;
DROP POLICY IF EXISTS cat_loss_list_owner_all ON public.cat_loss_list;
DROP POLICY IF EXISTS large_loss_triangle_values_owner_all ON public.large_loss_triangle_values;
DROP POLICY IF EXISTS top_risks_owner_all ON public.top_risks;

-- Create policies correctly
CREATE POLICY sheet_blobs_owner_all ON public.sheet_blobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = sheet_blobs.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = sheet_blobs.submission_id AND s.user_id = auth.uid()));

CREATE POLICY epi_summary_owner_all ON public.epi_summary FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = epi_summary.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = epi_summary.submission_id AND s.user_id = auth.uid()));

CREATE POLICY treaty_stats_prop_owner_all ON public.treaty_stats_prop FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = treaty_stats_prop.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = treaty_stats_prop.submission_id AND s.user_id = auth.uid()));

CREATE POLICY risk_profile_bands_owner_all ON public.risk_profile_bands FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_bands.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_bands.submission_id AND s.user_id = auth.uid()));

CREATE POLICY large_loss_list_owner_all ON public.large_loss_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_list.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_list.submission_id AND s.user_id = auth.uid()));

CREATE POLICY cat_loss_list_owner_all ON public.cat_loss_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = cat_loss_list.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = cat_loss_list.submission_id AND s.user_id = auth.uid()));

CREATE POLICY large_loss_triangle_values_owner_all ON public.large_loss_triangle_values FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_triangle_values.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_triangle_values.submission_id AND s.user_id = auth.uid()));

CREATE POLICY top_risks_owner_all ON public.top_risks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = top_risks.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = top_risks.submission_id AND s.user_id = auth.uid()));

-- Helpful indexes for blobs
CREATE INDEX IF NOT EXISTS idx_sheet_blobs_submission ON public.sheet_blobs(submission_id);
CREATE INDEX IF NOT EXISTS idx_sheet_blobs_sub_sheet ON public.sheet_blobs(submission_id, sheet_name);


-- RPC: get_submission_package(submission_id)
create or replace function public.get_submission_package(p_submission_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_sub jsonb;
  v_blobs jsonb;
  v_package jsonb;
begin
  -- parent submission
  select to_jsonb(s) into v_sub from public.submissions s where s.id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('error','submission not found');
  end if;

  -- collect blobs keyed by sheet_name
  select coalesce(jsonb_object_agg(b.sheet_name, b.payload), '{}'::jsonb)
    into v_blobs
  from public.sheet_blobs b
  where b.submission_id = p_submission_id;

  v_package := jsonb_build_object(
    'submission', v_sub,
    'epi_summary', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.epi_summary t where t.submission_id = p_submission_id), '[]'::jsonb),
    'treaty_stats_prop', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.treaty_stats_prop t where t.submission_id = p_submission_id), '[]'::jsonb),
    'risk_profile_bands', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.risk_profile_bands t where t.submission_id = p_submission_id), '[]'::jsonb),
    'large_loss_list', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.large_loss_list t where t.submission_id = p_submission_id), '[]'::jsonb),
    'cat_loss_list', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.cat_loss_list t where t.submission_id = p_submission_id), '[]'::jsonb),
    'large_loss_triangle_values', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.large_loss_triangle_values t where t.submission_id = p_submission_id), '[]'::jsonb),
    'top_risks', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.top_risks t where t.submission_id = p_submission_id), '[]'::jsonb),
    'blobs', v_blobs
  );

  return v_package;
end;
$$;

comment on function public.get_submission_package(uuid) is 'Aggregates a full submission (parent row, table-backed children, and sheet_blobs) into one JSON package.';
