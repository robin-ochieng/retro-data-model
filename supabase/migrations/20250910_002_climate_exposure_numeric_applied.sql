-- Migration: Convert eml_mpl_limit_applied boolean -> numeric (1 or null) inside sheet_blobs.payload.rows for Climate change exposure
-- Idempotent: only transforms elements where the key is boolean.
-- Run safely multiple times; boolean values replaced with numeric/null once.

begin;

with targets as (
  select id, payload,
         jsonb_path_query_array(payload, '$.rows[*]') as rows_array
  from sheet_blobs
  where sheet_name = 'Climate change exposure'
)
update sheet_blobs sb
set payload = (
  select jsonb_set(
           sb.payload,
           '{rows}',
           (
             select jsonb_agg(
               case
                 when jsonb_typeof(elem->'eml_mpl_limit_applied') = 'boolean' then
                   elem || jsonb_build_object(
                     'eml_mpl_limit_applied', case (elem->>'eml_mpl_limit_applied')::boolean when true then '1' else 'null' end::jsonb
                   )
                 else elem
               end
             )
             from jsonb_array_elements(sb.payload->'rows') elem
           )
         )
)
where sb.id in (select id from targets);

commit;
