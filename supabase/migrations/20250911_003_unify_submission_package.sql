-- Migration: Unify get_submission_package canonical definition
-- Date: 2025-09-11
-- Purpose: Provide a single authoritative JSON aggregation including all current relational datasets and blobs.
-- Adds a package_version field (integer) for forward evolution.

create or replace function public.get_submission_package(p_submission_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_sub jsonb;
  v_blobs jsonb;
  v_package jsonb;
  v_uw_limit_meta jsonb;
  v_risk_profile_meta jsonb;
begin
  -- Parent submission
  select to_jsonb(s) into v_sub from public.submissions s where s.id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('error','submission not found');
  end if;

  -- sheet_blobs keyed map (legacy + non-migrated sheets)
  select coalesce(jsonb_object_agg(b.sheet_name, b.payload), '{}'::jsonb)
    into v_blobs
  from public.sheet_blobs b
  where b.submission_id = p_submission_id;

  -- Meta tables (strip volatile columns)
  select to_jsonb(m) - 'updated_at' into v_uw_limit_meta from public.uw_limit_meta m where m.submission_id = p_submission_id;
  select to_jsonb(m) - 'updated_at' into v_risk_profile_meta from public.risk_profile_meta m where m.submission_id = p_submission_id;

  v_package := jsonb_build_object(
    'package_version', 1,
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
    'uw_limit_meta', coalesce(v_uw_limit_meta, '{}'::jsonb),
    'risk_profile_meta', coalesce(v_risk_profile_meta, '{}'::jsonb),
    'blobs', v_blobs
  );
  return v_package;
end;
$$;

comment on function public.get_submission_package(uuid) is 'Canonical submission export (versioned). Includes submission, all relational child tables, meta tables, and residual sheet_blobs. package_version enables non-breaking future evolution.';
