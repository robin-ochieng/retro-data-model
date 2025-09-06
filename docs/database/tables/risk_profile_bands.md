# risk_profile_bands

Purpose: Risk profile bands per segment (gross/net).

## Columns

- id bigserial primary key
- submission_id uuid not null references public.submissions(id) on delete cascade
- segment text not null check (segment in ('gross','net'))
- band_label text
- exposure numeric
- premium numeric
- claims numeric
- frequency numeric
- severity numeric
- created_at timestamptz not null default now()

## Constraints

- PK: id
- CHECK: segment in ('gross','net')

## Indexes

- idx_risk_profile_bands_submission on (submission_id)
- idx_risk_profile_bands_sub_segment on (submission_id, segment)

## RLS and Policies

RLS: enabled

Policies (owner via parent submission):

```sql
CREATE POLICY risk_profile_bands_owner_all ON public.risk_profile_bands FOR ALL
  USING (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_bands.submission_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = risk_profile_bands.submission_id AND s.user_id = auth.uid()));
```

## Examples

- Aggregate totals by segment:

```sql
select segment, sum(exposure) as total_exposure, sum(premium) as total_premium
from public.risk_profile_bands
where submission_id = $1
group by segment;
```
