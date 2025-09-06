# epi_summary

Purpose: Premium Summary (EPI) rows.

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- treaty_type text not null default 'Quota Share Treaty'
- programme text
- estimate_type text
- period_label text
- epi_value numeric
- currency text
- created_at timestamptz not null default now()

## Constraints

- PK: id

## Indexes

- idx_epi_summary_submission on (submission_id)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY epi_summary_owner_all ON public.epi_summary FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = epi_summary.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = epi_summary.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Delete + re-insert current rows for a submission:

```sql
delete from public.epi_summary where submission_id = $1;
-- followed by bulk insert of normalized rows
```
