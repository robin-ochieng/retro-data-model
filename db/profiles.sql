-- Create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Keep updated_at fresh
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

-- Policies: users can manage only their own profile
create policy if not exists profiles_select_own on public.profiles
for select using (id = auth.uid());

create policy if not exists profiles_insert_own on public.profiles
for insert with check (id = auth.uid());

create policy if not exists profiles_update_own on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile after a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
