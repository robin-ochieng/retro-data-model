# top_risks

Purpose: Top 20 Risks per submission.

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- rank int not null
- insured text
- class_of_business text
- occupation text
- gross_sum_insured numeric
- fac_sum_insured numeric
- surplus_sum_insured numeric
- quota_share_sum_insured numeric
- net_sum_insured numeric
- gross_premium numeric
- fac_premium numeric
- surplus_premium numeric
- created_at timestamptz not null default now()

## Constraints

- PK: id
- UNIQUE: (submission_id, rank)

## Indexes

- idx_top_risks_submission on (submission_id)
- uidx_top_risks_submission_rank unique on (submission_id, rank)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY top_risks_owner_all ON public.top_risks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = top_risks.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = top_risks.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Enforce 20 rows per submission (application-level):

```sql
-- Query current count
select count(*) from public.top_risks where submission_id = $1;
```
