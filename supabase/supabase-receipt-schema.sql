create table if not exists public.receipt_item_dimension (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null unique,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipt_item_facts (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  purchase_date date not null,
  item_id uuid not null references public.receipt_item_dimension (id) on delete restrict,
  amount text not null check (length(btrim(amount)) > 0),
  price numeric(12, 2) not null check (price >= 0),
  price_per_unit numeric(12, 2) check (price_per_unit is null or price_per_unit >= 0),
  owner text not null default 'C' check (owner in ('A', 'C')),
  supermarket text,
  transaction_id text,
  discount numeric(12, 2) check (discount is null or discount >= 0),
  discount_plus numeric(12, 2) check (discount_plus is null or discount_plus >= 0),
  created_at timestamptz not null default now()
);

alter table public.receipt_item_facts
  add column if not exists price_per_unit numeric(12, 2)
  check (price_per_unit is null or price_per_unit >= 0);

alter table public.receipt_item_facts
  add column if not exists owner text not null default 'C'
  check (owner in ('A', 'C'));

alter table public.receipt_item_facts
  add column if not exists supermarket text;

update public.receipt_item_facts
set price_per_unit = round(
  price / nullif(
    replace(
      substring(btrim(amount) from '^([0-9]+([.,][0-9]+)?)'),
      ',',
      '.'
    )::numeric,
    0
  ),
  2
)
where price_per_unit is null
  and btrim(amount) ~ '^[0-9]+([.,][0-9]+)?'
  and replace(
    substring(btrim(amount) from '^([0-9]+([.,][0-9]+)?)'),
    ',',
    '.'
  )::numeric > 0;

create index if not exists receipt_item_facts_date_idx
  on public.receipt_item_facts (purchase_date);
create index if not exists receipt_item_facts_item_id_idx
  on public.receipt_item_facts (item_id);

create or replace function public.set_receipt_item_dimension_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists receipt_item_dimension_updated_at
  on public.receipt_item_dimension;
create trigger receipt_item_dimension_updated_at
  before update on public.receipt_item_dimension
  for each row execute function public.set_receipt_item_dimension_updated_at();

alter table public.receipt_item_dimension enable row level security;
alter table public.receipt_item_facts enable row level security;

drop policy if exists "Household members manage receipt item dimensions"
  on public.receipt_item_dimension;
create policy "Household members manage receipt item dimensions"
  on public.receipt_item_dimension
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

drop policy if exists "Household members manage receipt item facts"
  on public.receipt_item_facts;
create policy "Household members manage receipt item facts"
  on public.receipt_item_facts
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

revoke all on public.receipt_item_dimension, public.receipt_item_facts
  from public, anon;
grant select, insert, update, delete
  on public.receipt_item_dimension, public.receipt_item_facts
  to authenticated;

comment on table public.receipt_item_dimension is
  'Canonical receipt products; category is nullable until assigned by a user.';
comment on table public.receipt_item_facts is
  'Purchased receipt lines, linked to the canonical receipt item dimension.';
comment on column public.receipt_item_facts.source_key is
  'Stable Gmail receipt and line key used to make importer retries idempotent.';
comment on column public.receipt_item_facts.owner is
  'Receipt owner inferred from the receipt email subject: A for Kvittering, otherwise C.';
comment on column public.receipt_item_facts.supermarket is
  'Supermarket inferred from the receipt subject or receipt-history source; null when unknown.';
