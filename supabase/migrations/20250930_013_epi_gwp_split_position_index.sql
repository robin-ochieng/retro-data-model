-- Backfill position values and create index for ordering performance
begin;
-- Populate position column deterministically if null (order by created_at, id)
with ordered as (
  select id, row_number() over (order by submission_id, created_at, id) - 1 as rn
  from public.epi_gwp_split
)
update public.epi_gwp_split e
set position = o.rn
from ordered o
where e.id = o.id and (e.position is null);

-- Create index to speed retrieval by submission and position
create index if not exists epi_gwp_split_submission_position_idx on public.epi_gwp_split (submission_id, position);
commit;