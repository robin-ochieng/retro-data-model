# submissions

Purpose: Parent record for each data collection workflow.

## Columns

- id uuid primary key default gen_random_uuid()
- user_id uuid not null
- line_of_business text not null check (line_of_business in ('property','casualty'))
- status text not null default 'in-progress'
- meta jsonb not null default '{}'::jsonb
- created_at timestamptz not null default now()
- submitted_at timestamptz

## Constraints

- PK: id
- CHECK: line_of_business in ('property','casualty')

## Indexes

- (implicit primary key index on id)

## RLS and Policies

RLS: enabled

Policies:

```sql
CREATE POLICY submissions_owner_select ON public.submissions 
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY submissions_owner_ins ON public.submissions 
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY submissions_owner_upd ON public.submissions 
  FOR UPDATE USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY submissions_owner_del ON public.submissions 
  FOR DELETE USING (user_id = auth.uid());
```

## Examples

- Recent submissions for current user:

```sql
select id, line_of_business, status, created_at
from public.submissions
where user_id = auth.uid()
order by created_at desc
limit 10;
```
