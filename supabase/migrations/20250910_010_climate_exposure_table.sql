-- Migration: create dedicated climate_exposure table and integrate with existing RLS patterns
-- Date: 2025-09-10
-- Idempotent: safe to re-run

-- 1. Table creation
create table if not exists public.climate_exposure (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  policy_inception_date text, -- stored normalized YYYY-MM-DD
  policy_expiry_date text,
  insured text,
  policy_category text,
  policy_description text,
  nature_of_risk text,
  gross_exposure_tsi numeric,
  cedants_exposure_tsi numeric,
  eml_mpl_limit_applied numeric,
  eml_mpl_limit numeric,
  ceded_prop_reinsurance_exposure numeric,
  net_inuring_prop_reinsurance_exposure numeric,
  gross_premium numeric,
  cedants_premium numeric,
  ceded_prop_reinsurance_premium numeric,
  net_prop_reinsurance_premium numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_climate_exposure_submission on public.climate_exposure(submission_id);

-- 2. Enable RLS if not already
alter table public.climate_exposure enable row level security;

-- 3. Policy (owner all) - drop & recreate to be idempotent
DROP POLICY IF EXISTS climate_exposure_owner_all ON public.climate_exposure;
CREATE POLICY climate_exposure_owner_all ON public.climate_exposure FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = climate_exposure.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = climate_exposure.submission_id AND s.user_id = auth.uid()));

-- 4. Optional helper function to lazy-migrate one submission from sheet_blobs
create or replace function public.migrate_climate_exposure_from_blob(p_submission_id uuid)
returns int
language plpgsql
security definer
as $$
DECLARE
  v_payload jsonb;
  v_rows jsonb;
  v_count int := 0;
BEGIN
  -- Skip if table already has rows
  if exists (select 1 from public.climate_exposure where submission_id = p_submission_id) then
    return 0;
  end if;
  select b.payload into v_payload
    from public.sheet_blobs b
    where b.submission_id = p_submission_id
      and b.sheet_name = 'Climate change exposure';
  if v_payload is null then
    return 0; -- nothing to migrate
  end if;
  -- Support legacy shapes: { rows: [...] } or { exposures: [...] }
  if (v_payload ? 'rows') then
    v_rows := v_payload->'rows';
  elsif (v_payload ? 'exposures') then
    v_rows := v_payload->'exposures';
  else
    return 0; -- unknown structure
  end if;
  if jsonb_typeof(v_rows) <> 'array' then
    return 0;
  end if;
  -- Insert rows
  insert into public.climate_exposure (
    submission_id,
    policy_inception_date,
    policy_expiry_date,
    insured,
    policy_category,
    policy_description,
    nature_of_risk,
    gross_exposure_tsi,
    cedants_exposure_tsi,
    eml_mpl_limit_applied,
    eml_mpl_limit,
    ceded_prop_reinsurance_exposure,
    net_inuring_prop_reinsurance_exposure,
    gross_premium,
    cedants_premium,
    ceded_prop_reinsurance_premium,
    net_prop_reinsurance_premium
  )
  select p_submission_id,
         (r->>'policy_inception_date'),
         (r->>'policy_expiry_date'),
         (r->>'insured'),
         (r->>'policy_category'),
         (r->>'policy_description'),
         (r->>'nature_of_risk'),
         nullif((r->>'gross_exposure_tsi'),'')::numeric,
         nullif((r->>'cedants_exposure_tsi'),'')::numeric,
         nullif((r->>'eml_mpl_limit_applied'),'')::numeric,
         nullif((r->>'eml_mpl_limit'),'')::numeric,
         nullif((r->>'ceded_prop_reinsurance_exposure'),'')::numeric,
         nullif((r->>'net_inuring_prop_reinsurance_exposure'),'')::numeric,
         nullif((r->>'gross_premium'),'')::numeric,
         nullif((r->>'cedants_premium'),'')::numeric,
         nullif((r->>'ceded_prop_reinsurance_premium'),'')::numeric,
         nullif((r->>'net_prop_reinsurance_premium'),'')::numeric
    from jsonb_array_elements(v_rows) as r;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mark blob as migrated (non-destructive) to avoid repeat
  update public.sheet_blobs
    set payload = jsonb_set(coalesce(payload,'{}'::jsonb), '{migrated}', 'true'::jsonb)
    where submission_id = p_submission_id and sheet_name = 'Climate change exposure';

  return v_count;
END;
$$;

comment on function public.migrate_climate_exposure_from_blob(uuid) is 'Lazy-migrates climate exposure rows from sheet_blobs JSON into table; returns number of inserted rows.';

-- 5. Update submission package aggregator to include climate_exposure rows
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
  select to_jsonb(s) into v_sub from public.submissions s where s.id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('error','submission not found');
  end if;
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
    'climate_exposure', coalesce((select jsonb_agg(to_jsonb(t) - 'created_at') from public.climate_exposure t where t.submission_id = p_submission_id), '[]'::jsonb),
    'blobs', v_blobs
  );
  return v_package;
end;
$$;
