-- Add theme preference to profiles (light|dark|system), default system
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='theme'
  ) then
    alter table public.profiles
      add column theme text not null default 'system';
  end if;
end $$;
