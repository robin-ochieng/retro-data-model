-- Property Aggregate Triangulation (normalized)
-- Six measures: written_premium, number_of_losses, paid_losses, loss_reserves, incurred_losses, wi_lr_pct

create table if not exists public.property_aggregate_triangle_values (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  measure text not null check (measure in (
    'written_premium', 'number_of_losses', 'paid_losses', 'loss_reserves', 'incurred_losses', 'wi_lr_pct'
  )),
  uw_year int not null check (uw_year between 1900 and 2100),
  development_months int not null check (development_months >= 0),
  value numeric(20,6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, measure, uw_year, development_months),
  check (measure <> 'wi_lr_pct' or value is null or (value >= 0 and value <= 1))
);

-- The UNIQUE constraint creates a composite index; additional redundant indexes removed.

-- RLS
alter table public.property_aggregate_triangle_values enable row level security;
drop policy if exists property_aggregate_triangle_values_owner_all on public.property_aggregate_triangle_values;
create policy property_aggregate_triangle_values_owner_all on public.property_aggregate_triangle_values for all
  using (exists (select 1 from public.submissions s where s.id = property_aggregate_triangle_values.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = property_aggregate_triangle_values.submission_id and s.user_id = auth.uid()));

-- Timestamp trigger function (idempotent create)
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.property_aggregate_triangle_values;
create trigger set_updated_at
before update on public.property_aggregate_triangle_values
for each row execute function public.tg_set_updated_at();

-- RPC: single-cell upsert for autosave
create or replace function public.upsert_property_aggregate_triangle_cell(
  p_submission_id uuid,
  p_measure text,
  p_uw_year int,
  p_development_months int,
  p_value numeric
) returns void
language plpgsql
security invoker
as $$
begin
  if not exists (
    select 1 from public.submissions s
    where s.id = p_submission_id and s.user_id = auth.uid()
  ) then
    raise exception 'not owner';
  end if;

  insert into public.property_aggregate_triangle_values(submission_id, measure, uw_year, development_months, value)
  values (p_submission_id, p_measure, p_uw_year, p_development_months, p_value)
  on conflict (submission_id, measure, uw_year, development_months)
  do update set value = excluded.value;
end;
$$;

-- RPC: batch replace/upsert from array of rows
-- p_rows example: [{"measure":"written_premium","uw_year":2022,"development_months":12,"value":123.45}, ...]
create or replace function public.replace_property_aggregate_triangle(
  p_submission_id uuid,
  p_rows jsonb,
  p_delete_missing boolean default false
) returns integer
language plpgsql
security invoker
as $$
declare
  v_count int := 0;
begin
  if not exists (
    select 1 from public.submissions s
    where s.id = p_submission_id and s.user_id = auth.uid()
  ) then
    raise exception 'not owner';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text, 0));

  with upserts as (
    select
      (r->>'measure')::text as measure,
      (r->>'uw_year')::int as uw_year,
      (r->>'development_months')::int as development_months,
      (r->>'value')::numeric as value
    from jsonb_array_elements(p_rows) r
  )
  insert into public.property_aggregate_triangle_values(submission_id, measure, uw_year, development_months, value)
  select p_submission_id, u.measure, u.uw_year, u.development_months, u.value
  from upserts u
  on conflict (submission_id, measure, uw_year, development_months)
  do update set value = excluded.value;

  get diagnostics v_count = row_count;

  if p_delete_missing then
    delete from public.property_aggregate_triangle_values t
    where t.submission_id = p_submission_id
      and not exists (
        select 1
        from jsonb_array_elements(p_rows) r
        where r->>'measure' = t.measure
          and (r->>'uw_year')::int = t.uw_year
          and (r->>'development_months')::int = t.development_months
      );
  end if;

  return v_count;
end;
$$;
