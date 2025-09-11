-- Migration: create uw_limits relational storage replacing blob approach for 'UW Limit' sheet
-- Date: 2025-09-11
-- Idempotent: safe to re-run

-- 1. Tables
-- Note: renamed column `limit` -> `limit_value` to avoid reserved word conflicts in some SQL contexts
create table if not exists public.uw_limits (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  risk_code text,
  limit_value text,
  created_at timestamptz not null default now()
);
create index if not exists idx_uw_limits_submission on public.uw_limits(submission_id);

-- Separate meta table for additional comments (1:1 per submission)
create table if not exists public.uw_limit_meta (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  additional_comments text,
  updated_at timestamptz not null default now()
);

-- 2. RLS enable
alter table public.uw_limits enable row level security;
alter table public.uw_limit_meta enable row level security;

-- 3. Policies (owner all) - drop & recreate
DROP POLICY IF EXISTS uw_limits_owner_all ON public.uw_limits;
CREATE POLICY uw_limits_owner_all ON public.uw_limits FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = uw_limits.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = uw_limits.submission_id AND s.user_id = auth.uid()));

DROP POLICY IF EXISTS uw_limit_meta_owner_all ON public.uw_limit_meta;
CREATE POLICY uw_limit_meta_owner_all ON public.uw_limit_meta FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = uw_limit_meta.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = uw_limit_meta.submission_id AND s.user_id = auth.uid()));

-- 4. Upsert RPC to atomically replace limits for a submission
create or replace function public.replace_uw_limits(p_submission_id uuid, p_rows jsonb, p_additional_comments text default '')
returns int
language plpgsql
security definer
as $$
DECLARE
  v_count int := 0;
BEGIN
  if jsonb_typeof(p_rows) <> 'array' then
    return 0;
  end if;
  -- Delete existing rows
  delete from public.uw_limits where submission_id = p_submission_id;
  -- Insert new
  insert into public.uw_limits (submission_id, risk_code, limit_value)
  select p_submission_id,
         nullif(r->>'risk_code',''),
         nullif(r->>'limit','') -- JSON key remains 'limit' for backward compatibility
    from jsonb_array_elements(p_rows) as r
    where coalesce(r->>'risk_code','') <> '' or coalesce(r->>'limit','') <> '';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  -- Upsert meta
  insert into public.uw_limit_meta (submission_id, additional_comments)
    values (p_submission_id, p_additional_comments)
    on conflict (submission_id) do update set additional_comments = excluded.additional_comments, updated_at = now();
  return v_count;
END;
$$;
comment on function public.replace_uw_limits(uuid, jsonb, text) is 'Replaces all uw_limits rows for a submission and stores additional comments; returns inserted row count.';

-- 5. Migration helper from blob
create or replace function public.migrate_uw_limit_from_blob(p_submission_id uuid)
returns int
language plpgsql
security definer
as $$
DECLARE
  v_payload jsonb;
  v_rows jsonb;
  v_comments text;
  v_count int := 0;
BEGIN
  -- Skip if already migrated
  if exists (select 1 from public.uw_limits where submission_id = p_submission_id) then
    return 0;
  end if;
  select b.payload into v_payload
    from public.sheet_blobs b
    where b.submission_id = p_submission_id and b.sheet_name = 'UW Limit';
  if v_payload is null then
    return 0;
  end if;
  v_rows := coalesce(v_payload->'limits', '[]'::jsonb);
  v_comments := coalesce(v_payload->>'additional_comments','');
  PERFORM public.replace_uw_limits(p_submission_id, v_rows, v_comments);
  -- Mark blob as migrated
  update public.sheet_blobs
    set payload = jsonb_set(coalesce(payload,'{}'::jsonb), '{migrated}', 'true'::jsonb)
    where submission_id = p_submission_id and sheet_name = 'UW Limit';
  GET DIAGNOSTICS v_count = ROW_COUNT; -- not exact inserted, but indicates success
  return v_count;
END;
$$;
comment on function public.migrate_uw_limit_from_blob(uuid) is 'Migrates UW Limit blob JSON into relational tables (idempotent).';

-- 6. Extend get_submission_package to include uw_limits and uw_limit_meta
create or replace function public.get_submission_package(p_submission_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_sub jsonb;
  v_blobs jsonb;
  v_package jsonb;
  v_meta jsonb;
begin
  select to_jsonb(s) into v_sub from public.submissions s where s.id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('error','submission not found');
  end if;
  select coalesce(jsonb_object_agg(b.sheet_name, b.payload), '{}'::jsonb)
    into v_blobs
  from public.sheet_blobs b
  where b.submission_id = p_submission_id;
  select to_jsonb(m) - 'updated_at' into v_meta from public.uw_limit_meta m where m.submission_id = p_submission_id;

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
  'uw_limits', coalesce((select jsonb_agg((to_jsonb(t) - 'created_at') || jsonb_build_object('limit', t.limit_value)) from public.uw_limits t where t.submission_id = p_submission_id), '[]'::jsonb),
    'uw_limit_meta', coalesce(v_meta, '{}'::jsonb),
    'blobs', v_blobs
  );
  return v_package;
end;
$$;
