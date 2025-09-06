# treaty_stats_prop

Purpose: Treaty Statistics (Property) per underwriting year.

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- uw_year int not null
- written_premium numeric
- earned_premium numeric
- commission_amount numeric
- commission_pct numeric
- profit_commission numeric
- total_commission numeric
- paid_losses numeric
- os_losses numeric
- incurred_losses numeric
- loss_ratio numeric
- uw_profit numeric
- created_at timestamptz not null default now()

## Constraints

- PK: id
- UNIQUE: (submission_id, uw_year)

## Indexes

- idx_treaty_stats_prop_submission on (submission_id)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY treaty_stats_prop_owner_all ON public.treaty_stats_prop FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = treaty_stats_prop.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = treaty_stats_prop.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Upsert by (submission_id, uw_year):

```sql
insert into public.treaty_stats_prop (submission_id, uw_year, written_premium)
values ($1, 2024, 123.45)
on conflict (submission_id, uw_year)
  do update set written_premium = excluded.written_premium;
```
