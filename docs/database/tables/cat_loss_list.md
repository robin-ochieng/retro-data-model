# cat_loss_list

Purpose: Catastrophe Loss list.

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- event_date text
- event_name text
- uw_year int
- gross_incurred numeric
- paid_to_date numeric
- gross_outstanding numeric
- currency text
- notes text
- created_at timestamptz not null default now()

## Constraints

- PK: id

## Indexes

- idx_cat_loss_list_submission on (submission_id)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY cat_loss_list_owner_all ON public.cat_loss_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = cat_loss_list.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = cat_loss_list.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Events by year:

```sql
select uw_year, count(*)
from public.cat_loss_list
where submission_id = $1
group by uw_year
order by uw_year;
```
