-- Cat Loss List (Property) relational tables with meta and RLS
create table if not exists public.cat_loss_list_prop (
  id bigserial primary key,
  submission_id uuid not null references public.submissions(id) on delete cascade,
  loss_id text,
  uw_year int,
  name text,
  dol date,
  type_of_loss text,
  gross_sum_insured numeric,
  gross_incurred numeric,
  paid_to_date numeric,
  gross_outstanding numeric,
  fac_amount numeric,
  net_of_fac numeric,
  surplus_cession numeric,
  qs_cession numeric,
  net_of_proportional numeric,
  xol_payment numeric,
  currency text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cat_loss_list_prop_submission on public.cat_loss_list_prop(submission_id);

create table if not exists public.cat_loss_list_meta_prop (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cat_loss_list_prop enable row level security;
alter table public.cat_loss_list_meta_prop enable row level security;

drop policy if exists cat_loss_list_prop_owner_all on public.cat_loss_list_prop;
create policy cat_loss_list_prop_owner_all on public.cat_loss_list_prop for all
  using (exists (select 1 from public.submissions s where s.id = cat_loss_list_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = cat_loss_list_prop.submission_id and s.user_id = auth.uid()));

drop policy if exists cat_loss_list_meta_prop_owner_all on public.cat_loss_list_meta_prop;
create policy cat_loss_list_meta_prop_owner_all on public.cat_loss_list_meta_prop for all
  using (exists (select 1 from public.submissions s where s.id = cat_loss_list_meta_prop.submission_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.submissions s where s.id = cat_loss_list_meta_prop.submission_id and s.user_id = auth.uid()));
