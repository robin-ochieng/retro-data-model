# profiles

Purpose: User profile; stores display name and theme preference.

## Columns

- id uuid primary key references auth.users(id) on delete cascade
- full_name text not null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- theme text not null default 'system'  -- added by 20250907_001_add_theme_to_profiles.sql

## Constraints

- PK: id

## Indexes

- (implicit primary key index on id)

## RLS and Policies

RLS: enabled

Policies:

```sql
create policy if not exists profiles_select_own on public.profiles
for select using (id = auth.uid());

create policy if not exists profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

create policy if not exists profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());
```

## Examples

- Update theme:

```sql
update public.profiles set theme = 'dark' where id = auth.uid();
```
