# large_loss_list

Purpose: Large Loss list.

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- loss_date text
- uw_year int
- insured text
- cause_of_loss text
- gross_sum_insured numeric
- gross_incurred numeric
- paid_to_date numeric
- gross_outstanding numeric
- currency text
- notes text
- created_at timestamptz not null default now()

## Constraints

- PK: id

## Indexes

- idx_large_loss_list_submission on (submission_id)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY large_loss_list_owner_all ON public.large_loss_list FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_list.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = large_loss_list.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Recent large losses:

```sql
select * from public.large_loss_list
where submission_id = $1
order by created_at desc
limit 20;
```
