-- Property Cresta Zone Control: normalized storage and RPCs
-- Creates table, constraints, RLS, triggers, and helper RPCs for autosave and batch import.

begin;

-- Table
create table if not exists public.property_cresta_zone_values (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  section text not null,
  zone smallint not null,
  zone_description text not null default '',
  category text,
  gross numeric(20,6) not null default 0,
  net numeric(20,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_cresta_zone_values_section_check
    check (section in ('sum_insured','personal','commercial','industrial','engineering')),
  constraint property_cresta_zone_values_zone_check
    check (zone between 0 and 19), -- 0 represents Unallocated
  constraint property_cresta_zone_values_category_check
    check (
      (section = 'sum_insured' and category is null)
      or (section = 'personal' and category in ('buildings','content','buildings_contents','motor','others'))
      or (section = 'commercial' and category in ('buildings','content','buildings_contents','motor','bi','others'))
      or (section = 'industrial' and category in ('buildings','content','buildings_contents','motor','bi','others'))
      or (section = 'engineering' and category in ('engineering'))
    )
);

create unique index if not exists uq_property_cresta_zone_values
  on public.property_cresta_zone_values (submission_id, section, zone, category);

create index if not exists idx_property_cresta_zone_values_submission
  on public.property_cresta_zone_values (submission_id);

create index if not exists idx_property_cresta_zone_values_section
  on public.property_cresta_zone_values (submission_id, section);

-- Trigger to maintain updated_at
create or replace function public.set_updated_at_property_cresta()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists tg_set_updated_at_property_cresta on public.property_cresta_zone_values;
create trigger tg_set_updated_at_property_cresta
before update on public.property_cresta_zone_values
for each row execute function public.set_updated_at_property_cresta();

-- RLS
alter table public.property_cresta_zone_values enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'property_cresta_zone_values' and policyname = 'Owner can access own cresta'
  ) then
    create policy "Owner can access own cresta" on public.property_cresta_zone_values
      using (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()))
      with check (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));
  end if;
end $$;

-- RPC: per-cell upsert
create or replace function public.upsert_property_cresta_zone_value(
  p_submission_id uuid,
  p_section text,
  p_zone int,
  p_category text,
  p_zone_description text,
  p_gross numeric,
  p_net numeric
) returns void language plpgsql security definer as $$
begin
  -- Ownership check
  if not exists (select 1 from public.submissions s where s.id = p_submission_id and s.user_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;

  insert into public.property_cresta_zone_values as t
    (submission_id, section, zone, category, zone_description, gross, net)
  values
    (p_submission_id, p_section, greatest(0, least(19, p_zone)), nullif(p_category, '')::text,
     coalesce(p_zone_description, ''), greatest(0, p_gross), greatest(0, p_net))
  on conflict (submission_id, section, zone, category)
  do update set zone_description = excluded.zone_description,
                gross = excluded.gross,
                net = excluded.net,
                updated_at = now();
end;$$;

-- RPC: batch replace per section
create or replace function public.replace_property_cresta_zone_section(
  p_submission_id uuid,
  p_section text,
  p_rows jsonb,
  p_delete_missing boolean default false
) returns integer language plpgsql security definer as $$
declare
  v_lock_key bigint;
  v_count int := 0;
begin
  -- Ownership check
  if not exists (select 1 from public.submissions s where s.id = p_submission_id and s.user_id = auth.uid()) then
    raise exception 'Not allowed';
  end if;

  v_lock_key := (('42'::bigint << 32) | ('7'::bigint << 24) | (hashtext(p_section)::bigint & x'FFFFFF'::bigint));
  perform pg_advisory_xact_lock(v_lock_key);

  -- temp staging
  create temporary table on commit drop _stg_cresta (
    submission_id uuid,
    section text,
    zone smallint,
    zone_description text,
    category text,
    gross numeric(20,6),
    net numeric(20,6)
  ) on commit drop;

  insert into _stg_cresta
  select p_submission_id,
         p_section,
         greatest(0, least(19, coalesce((x->>'zone')::int, 0)))::smallint as zone,
         coalesce(x->>'zone_description','') as zone_description,
         nullif(x->>'category','') as category,
         greatest(0, coalesce((x->>'gross')::numeric, 0)) as gross,
         greatest(0, coalesce((x->>'net')::numeric, 0)) as net
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as x;

  -- upsert
  insert into public.property_cresta_zone_values as t
    (submission_id, section, zone, category, zone_description, gross, net)
  select submission_id, section, zone, category, zone_description, gross, net from _stg_cresta
  on conflict (submission_id, section, zone, category)
  do update set zone_description = excluded.zone_description,
                gross = excluded.gross,
                net = excluded.net,
                updated_at = now();

  get diagnostics v_count = row_count;

  if p_delete_missing then
    delete from public.property_cresta_zone_values t
    where t.submission_id = p_submission_id
      and t.section = p_section
      and not exists (
        select 1 from _stg_cresta s
        where s.submission_id = t.submission_id
          and s.section = t.section
          and s.zone = t.zone
          and coalesce(s.category, '') = coalesce(t.category, '')
      );
  end if;

  return v_count;
end;$$;

-- Optional: get all values for a submission
create or replace function public.get_property_cresta_zone_values(
  p_submission_id uuid
) returns setof public.property_cresta_zone_values
language sql security definer as $$
  select * from public.property_cresta_zone_values where submission_id = p_submission_id;
$$;

-- One-off backfill from sheet_blobs (if present)
-- Reads sheet_blobs payload at 'Cresta Zone Control (Property)' and inserts normalized rows.
create or replace function public.migrate_property_cresta_from_blob(p_submission_id uuid)
returns integer language plpgsql security definer as $$
declare
  v_payload jsonb;
  v_count int := 0;
  r jsonb;
  c text;
  v jsonb;
begin
  select payload::jsonb into v_payload
  from public.sheet_blobs
  where submission_id = p_submission_id and sheet_name = 'Cresta Zone Control (Property)'
  limit 1;

  if v_payload is null then
    return 0;
  end if;

  -- sum_insured (simple rows)
  for r in select * from jsonb_array_elements(coalesce(v_payload->'sum_insured', '[]'::jsonb)) loop
    perform public.upsert_property_cresta_zone_value(
      p_submission_id,
      'sum_insured',
      coalesce((r->>'zone')::int, 0),
      null,
      coalesce(r->>'zone_description',''),
      coalesce((r->>'gross')::numeric,0),
      coalesce((r->>'net')::numeric,0)
    );
    v_count := v_count + 1;
  end loop;

  -- personal (complex)
  for r in select * from jsonb_array_elements(coalesce(v_payload->'personal', '[]'::jsonb)) loop
    for c, v in select key, value from jsonb_each(coalesce(r->'values','{}'::jsonb)) loop
      perform public.upsert_property_cresta_zone_value(
        p_submission_id,
        'personal',
        coalesce((r->>'zone')::int, 0),
        c,
        coalesce(r->>'zone_description',''),
        coalesce((v->>'gross')::numeric,0),
        coalesce((v->>'net')::numeric,0)
      );
      v_count := v_count + 1;
    end loop;
  end loop;

  -- commercial
  for r in select * from jsonb_array_elements(coalesce(v_payload->'commercial', '[]'::jsonb)) loop
    for c, v in select key, value from jsonb_each(coalesce(r->'values','{}'::jsonb)) loop
      perform public.upsert_property_cresta_zone_value(
        p_submission_id,
        'commercial',
        coalesce((r->>'zone')::int, 0),
        c,
        coalesce(r->>'zone_description',''),
        coalesce((v->>'gross')::numeric,0),
        coalesce((v->>'net')::numeric,0)
      );
      v_count := v_count + 1;
    end loop;
  end loop;

  -- industrial
  for r in select * from jsonb_array_elements(coalesce(v_payload->'industrial', '[]'::jsonb)) loop
    for c, v in select key, value from jsonb_each(coalesce(r->'values','{}'::jsonb)) loop
      perform public.upsert_property_cresta_zone_value(
        p_submission_id,
        'industrial',
        coalesce((r->>'zone')::int, 0),
        c,
        coalesce(r->>'zone_description',''),
        coalesce((v->>'gross')::numeric,0),
        coalesce((v->>'net')::numeric,0)
      );
      v_count := v_count + 1;
    end loop;
  end loop;

  -- engineering
  for r in select * from jsonb_array_elements(coalesce(v_payload->'engineering', '[]'::jsonb)) loop
    for c, v in select key, value from jsonb_each(coalesce(r->'values','{}'::jsonb)) loop
      perform public.upsert_property_cresta_zone_value(
        p_submission_id,
        'engineering',
        coalesce((r->>'zone')::int, 0),
        c,
        coalesce(r->>'zone_description',''),
        coalesce((v->>'gross')::numeric,0),
        coalesce((v->>'net')::numeric,0)
      );
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;$$;

commit;
