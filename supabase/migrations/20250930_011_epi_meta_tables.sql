-- EPI Summary relational meta tables (gwp split + additional comments)
begin;

create table if not exists public.epi_gwp_split (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  section text not null,
  premium numeric(20,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, section)
);

create table if not exists public.epi_summary_meta (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  additional_comments text not null default '',
  treaty_type text,
  updated_at timestamptz not null default now()
);

-- Trigger for updated_at
create or replace function public.tg_set_updated_at_epi()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists tg_set_updated_at_epi_gwp on public.epi_gwp_split;
create trigger tg_set_updated_at_epi_gwp before update on public.epi_gwp_split
for each row execute function public.tg_set_updated_at_epi();

drop trigger if exists tg_set_updated_at_epi_meta on public.epi_summary_meta;
create trigger tg_set_updated_at_epi_meta before update on public.epi_summary_meta
for each row execute function public.tg_set_updated_at_epi();

-- RLS
alter table public.epi_gwp_split enable row level security;
alter table public.epi_summary_meta enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='epi_gwp_split' and policyname='Owner epi gwp') then
    create policy "Owner epi gwp" on public.epi_gwp_split for all
      using (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()))
      with check (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename='epi_summary_meta' and policyname='Owner epi meta') then
    create policy "Owner epi meta" on public.epi_summary_meta for all
      using (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()))
      with check (exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid()));
  end if;
end $$;

-- Backfill from sheet_blobs (EPI Summary) if present
with blobs as (
  select submission_id, payload
  from public.sheet_blobs
  where sheet_name = 'EPI Summary'
)
insert into public.epi_summary_meta (submission_id, additional_comments, treaty_type)
select b.submission_id,
       coalesce(b.payload->>'additional_comments',''),
       b.payload->>'treaty_type'
from blobs b
on conflict (submission_id) do update
  set additional_comments = excluded.additional_comments,
      treaty_type = excluded.treaty_type,
      updated_at = now();

with gwp as (
  select submission_id, jsonb_array_elements(coalesce(payload->'gwp_split','[]'::jsonb)) as row
  from public.sheet_blobs
  where sheet_name='EPI Summary'
)
insert into public.epi_gwp_split (submission_id, section, premium)
select submission_id,
       coalesce(row->>'section','') as section,
       coalesce((row->>'premium')::numeric,0) as premium
from gwp
on conflict (submission_id, section) do update
  set premium = excluded.premium,
      updated_at = now();

commit;
