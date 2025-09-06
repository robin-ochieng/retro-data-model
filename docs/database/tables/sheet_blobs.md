# sheet_blobs

Purpose: Flexible JSONB payload storage per sheet/tab; primary key (submission_id, sheet_name).

## Columns

- submission_id uuid not null references public.submissions(id) on delete cascade
- sheet_name text not null
- payload jsonb not null default '{}'::jsonb
- updated_at timestamptz not null default now()

## Constraints

- PK: (submission_id, sheet_name)

## Indexes

- idx_sheet_blobs_submission on (submission_id)
- idx_sheet_blobs_sub_sheet on (submission_id, sheet_name)
- Functional JSONB (Header-specific):
  - idx_sheet_blobs_header_claims_start on ((payload->>'claims_period_start')) where sheet_name='Header'
  - idx_sheet_blobs_header_claims_end on ((payload->>'claims_period_end')) where sheet_name='Header'

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY sheet_blobs_owner_all ON public.sheet_blobs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = sheet_blobs.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = sheet_blobs.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Upsert sheet payload:

```sql
insert into public.sheet_blobs (submission_id, sheet_name, payload)
values ($1, 'Header', '{"client":"ACME"}')
on conflict (submission_id, sheet_name)
do update set payload = excluded.payload, updated_at = now();
```
