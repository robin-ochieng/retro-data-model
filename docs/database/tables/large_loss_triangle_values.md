# large_loss_triangle_values

Purpose: Large Loss Triangulation values.

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- measure text
- uw_or_acc_year int
- development_months int
- amount numeric
- created_at timestamptz not null default now()

## Constraints

- PK: id

## Indexes

- idx_large_loss_triangle_values_submission on (submission_id)
- idx_large_loss_triangle_values_comp on (submission_id, measure, uw_or_acc_year, development_months)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY large_loss_triangle_values_owner_all ON public.large_loss_triangle_values FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_triangle_values.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_triangle_values.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Values for paid measure at 12 months:

```sql
select * from public.large_loss_triangle_values
where submission_id = $1 and measure = 'paid' and development_months = 12
order by uw_or_acc_year;
```
