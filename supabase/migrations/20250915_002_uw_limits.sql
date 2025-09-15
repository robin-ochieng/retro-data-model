-- UW Limit relational storage and RPCs

create table if not exists public.uw_limits (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  risk_code text,
  limit_value text,
  created_at timestamptz not null default now()
);
create index if not exists idx_uw_limits_submission on public.uw_limits(submission_id);

create table if not exists public.uw_limit_meta (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  additional_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.uw_limits enable row level security;
alter table public.uw_limit_meta enable row level security;

drop policy if exists uw_limits_owner_all on public.uw_limits;
drop policy if exists uw_limit_meta_owner_all on public.uw_limit_meta;

create policy uw_limits_owner_all on public.uw_limits for all
  using (exists (select 1 from public.submissions s where s.id = uw_limits.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = uw_limits.submission_id and s.user_id = auth.uid()));

create policy uw_limit_meta_owner_all on public.uw_limit_meta for all
  using (exists (select 1 from public.submissions s where s.id = uw_limit_meta.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = uw_limit_meta.submission_id and s.user_id = auth.uid()));

-- RPC: replace_uw_limits(submission, rows, comments)
create or replace function public.replace_uw_limits(
  p_submission_id uuid,
  p_rows jsonb,
  p_additional_comments text
) returns void
language plpgsql security definer
as $$
begin
  -- Delete existing
  delete from public.uw_limits where submission_id = p_submission_id;

  -- Insert new rows
  insert into public.uw_limits (submission_id, risk_code, limit_value)
  select p_submission_id,
         (r->>'risk_code')::text,
         coalesce(r->>'limit_value', r->>'limit')::text
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as r;

  -- Upsert meta
  update public.uw_limit_meta
  set additional_comments = coalesce(p_additional_comments, ''), updated_at = now()
  where submission_id = p_submission_id;
  if not found then
    insert into public.uw_limit_meta (submission_id, additional_comments)
    values (p_submission_id, coalesce(p_additional_comments, ''))
    on conflict (submission_id) do update set additional_comments = excluded.additional_comments, updated_at = now();
  end if;
end;
$$;

comment on function public.replace_uw_limits(uuid, jsonb, text) is 'Replaces UW Limit rows for a submission and upserts additional comments.';

-- RPC: migrate from blob if needed
create or replace function public.migrate_uw_limit_from_blob(p_submission_id uuid) returns int
language plpgsql security definer
as $$
declare
  v_blob jsonb;
  v_rows jsonb;
  v_count int := 0;
begin
  select payload into v_blob
  from public.sheet_blobs
  where submission_id = p_submission_id and sheet_name = 'UW Limit';

  if v_blob is null then
    return 0;
  end if;

  v_rows := coalesce(v_blob->'limits', '[]'::jsonb);

  insert into public.uw_limits (submission_id, risk_code, limit_value)
  select p_submission_id,
         coalesce(r->>'risk_code','')::text,
         coalesce(coalesce(r->>'limit_value', r->>'limit'),'')::text
  from jsonb_array_elements(v_rows) r;

  get diagnostics v_count = row_count;

  -- meta
  insert into public.uw_limit_meta (submission_id, additional_comments)
  values (p_submission_id, coalesce(v_blob->>'additional_comments',''))
  on conflict (submission_id) do update set additional_comments = excluded.additional_comments, updated_at = now();

  return v_count;
end;
$$;
