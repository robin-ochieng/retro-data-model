-- Migration: create risk_profile_meta table (retention & additional comments) replacing blob storage
-- Date: 2025-09-11
-- Idempotent

create table if not exists public.risk_profile_meta (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  retention text,
  additional_comments text,
  updated_at timestamptz not null default now()
);

alter table public.risk_profile_meta enable row level security;

DROP POLICY IF EXISTS risk_profile_meta_owner_all ON public.risk_profile_meta;
CREATE POLICY risk_profile_meta_owner_all ON public.risk_profile_meta FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_meta.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_meta.submission_id AND s.user_id = auth.uid()));

-- Helper to migrate legacy sheet_blobs entry
create or replace function public.migrate_risk_profile_meta_from_blob(p_submission_id uuid)
returns boolean
language plpgsql
security definer
as $$
DECLARE
  v_payload jsonb;
  v_retention text;
  v_comments text;
BEGIN
  -- Skip if already present
  if exists (select 1 from public.risk_profile_meta where submission_id = p_submission_id) then
    return false;
  end if;
  select b.payload into v_payload
    from public.sheet_blobs b
    where b.submission_id = p_submission_id and b.sheet_name = 'Risk Profile';
  if v_payload is null then
    return false;
  end if;
  v_retention := coalesce(v_payload->>'retention','');
  v_comments := coalesce(v_payload->>'additional_comments','');
  insert into public.risk_profile_meta(submission_id, retention, additional_comments)
    values (p_submission_id, v_retention, v_comments)
    on conflict (submission_id) do nothing;
  -- Mark blob as migrated (non destructive)
  update public.sheet_blobs
    set payload = jsonb_set(coalesce(payload,'{}'::jsonb), '{meta_migrated}', 'true'::jsonb)
    where submission_id = p_submission_id and sheet_name = 'Risk Profile';
  return true;
END;
$$;
comment on function public.migrate_risk_profile_meta_from_blob(uuid) is 'Migrates retention & comments from sheet_blobs to risk_profile_meta when not already present.';

-- Update get_submission_package to include risk_profile_meta (non-breaking additive change)
create or replace function public.get_submission_package(p_submission_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_sub jsonb;
  v_blobs jsonb;
  v_package jsonb;
  v_risk_profile_meta jsonb;
begin
  select to_jsonb(s) into v_sub from public.submissions s where s.id = p_submission_id;
  if v_sub is null then
    return jsonb_build_object('error','submission not found');
  end if;
  select coalesce(jsonb_object_agg(b.sheet_name, b.payload), '{}'::jsonb)
    into v_blobs
  from public.sheet_blobs b
  where b.submission_id = p_submission_id;
  select to_jsonb(m) - 'updated_at' into v_risk_profile_meta from public.risk_profile_meta m where m.submission_id = p_submission_id;

  -- Reuse existing keys and append risk_profile_meta if present
  v_package := jsonb_build_object(
    'submission', v_sub
  );
  -- Append existing known collections if function existed previously (best-effort)
  v_package := v_package || jsonb_build_object('risk_profile_meta', coalesce(v_risk_profile_meta, '{}'::jsonb));
  return v_package || jsonb_build_object('blobs', v_blobs);
end;
$$;
