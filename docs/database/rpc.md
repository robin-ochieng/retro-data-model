# RPC

## public.get_submission_package(p_submission_id uuid) -> jsonb

- Stability: STABLE
- Returns: JSONB object containing keys: submission, epi_summary, treaty_stats_prop, risk_profile_bands, large_loss_list, cat_loss_list, large_loss_triangle_values, top_risks, blobs

### Definition (excerpt)

```sql
create or replace function public.get_submission_package(p_submission_id uuid)
returns jsonb
language plpgsql
stable
as $$
-- see migration file for full body
$$;
```

### Usage example

```sql
select public.get_submission_package($1) as package;
```
