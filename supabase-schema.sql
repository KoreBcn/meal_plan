create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  unit text not null default 'unit',
  price numeric(12, 2) not null default 0 check (price >= 0),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  dish_type text not null default '',
  servings integer not null default 1 check (servings > 0),
  total_price numeric(12, 2),
  price_per_person numeric(12, 2),
  historical_times integer not null default 0 check (historical_times >= 0),
  rating smallint check (rating between 1 and 5),
  source_of_recipe text not null default '',
  recipe_notes text not null default '',
  future_food_projects text not null default '',
  main_ingredient text not null default '',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

alter table public.dishes
  add column if not exists dish_type text not null default '',
  add column if not exists servings integer not null default 1,
  add column if not exists total_price numeric(12, 2),
  add column if not exists price_per_person numeric(12, 2),
  add column if not exists historical_times integer not null default 0,
  add column if not exists rating smallint,
  add column if not exists source_of_recipe text not null default '',
  add column if not exists recipe_notes text not null default '',
  add column if not exists future_food_projects text not null default '',
  add column if not exists main_ingredient text not null default '';

create table if not exists public.dish_ingredients (
  user_id uuid not null references auth.users (id) on delete cascade,
  dish_id uuid not null,
  ingredient_id uuid not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  primary key (dish_id, ingredient_id),
  foreign key (dish_id, user_id)
    references public.dishes (id, user_id) on delete cascade,
  foreign key (ingredient_id, user_id)
    references public.ingredients (id, user_id) on delete cascade
);

create table if not exists public.meal_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  dish_id uuid not null,
  created_at timestamptz not null default now(),
  unique (day, dish_id),
  foreign key (dish_id, user_id)
    references public.dishes (id, user_id) on delete cascade
);

create table if not exists public.shopping_checks (
  user_id uuid not null references auth.users (id) on delete cascade,
  check_key text not null primary key,
  checked boolean not null default false
);

create table if not exists public.household_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

create table if not exists public.shared_settings (
  id smallint primary key check (id = 1),
  owner_id uuid not null references auth.users (id) on delete restrict,
  initialized boolean not null default false,
  updated_at timestamptz not null default now()
);

create index if not exists ingredients_user_id_idx on public.ingredients (user_id);
create index if not exists dishes_user_id_idx on public.dishes (user_id);
create index if not exists dish_ingredients_user_id_idx on public.dish_ingredients (user_id);
create index if not exists meal_plan_user_id_idx on public.meal_plan (user_id);

create or replace function public.is_shared_meal_plan_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_shared_meal_plan_member() from public, anon;
grant execute on function public.is_shared_meal_plan_member() to authenticated;

alter table public.ingredients enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_ingredients enable row level security;
alter table public.meal_plan enable row level security;
alter table public.shopping_checks enable row level security;
alter table public.household_members enable row level security;
alter table public.shared_settings enable row level security;

drop policy if exists "Users manage their ingredients" on public.ingredients;
drop policy if exists "Shared household manages ingredients" on public.ingredients;
create policy "Shared household manages ingredients" on public.ingredients
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

drop policy if exists "Users manage their dishes" on public.dishes;
drop policy if exists "Shared household manages dishes" on public.dishes;
create policy "Shared household manages dishes" on public.dishes
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

drop policy if exists "Users manage their dish ingredients" on public.dish_ingredients;
drop policy if exists "Shared household manages dish ingredients" on public.dish_ingredients;
create policy "Shared household manages dish ingredients" on public.dish_ingredients
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

drop policy if exists "Users manage their meal plan" on public.meal_plan;
drop policy if exists "Shared household manages meal plan" on public.meal_plan;
create policy "Shared household manages meal plan" on public.meal_plan
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

drop policy if exists "Users manage their shopping checks" on public.shopping_checks;
drop policy if exists "Shared household manages shopping checks" on public.shopping_checks;
create policy "Shared household manages shopping checks" on public.shopping_checks
  for all to authenticated
  using (public.is_shared_meal_plan_member())
  with check (public.is_shared_meal_plan_member());

drop policy if exists "Members read their own membership" on public.household_members;
create policy "Members read their own membership" on public.household_members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Household members read shared settings" on public.shared_settings;
create policy "Household members read shared settings" on public.shared_settings
  for select to authenticated
  using (public.is_shared_meal_plan_member());

revoke all on public.ingredients, public.dishes, public.dish_ingredients,
  public.meal_plan, public.shopping_checks, public.household_members,
  public.shared_settings from public, anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.ingredients, public.dishes,
  public.dish_ingredients, public.meal_plan, public.shopping_checks to authenticated;
grant select on public.household_members, public.shared_settings to authenticated;

create or replace function public.save_dish(
  p_dish_id uuid,
  p_name text,
  p_ingredients jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  if not public.is_shared_meal_plan_member() then
    raise exception 'This account is not part of the shared meal plan';
  end if;

  select owner_id into v_owner_id
  from public.shared_settings
  where id = 1 and initialized;

  if v_owner_id is null then
    raise exception 'The shared meal plan has not been initialized';
  end if;

  insert into public.dishes (id, user_id, name)
  values (p_dish_id, v_owner_id, p_name)
  on conflict (id) do update
  set name = excluded.name;

  delete from public.dish_ingredients
  where user_id = v_owner_id and dish_id = p_dish_id;

  insert into public.dish_ingredients (user_id, dish_id, ingredient_id, quantity)
  select v_owner_id, p_dish_id, row_data.ingredient_id, row_data.quantity
  from jsonb_to_recordset(p_ingredients) as row_data(
    ingredient_id uuid, quantity numeric
  );
end;
$$;

create or replace function public.initialize_meal_plan(
  p_ingredients jsonb,
  p_dishes jsonb,
  p_dish_ingredients jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
begin
  if not public.is_shared_meal_plan_member() then
    raise exception 'This account is not part of the shared meal plan';
  end if;

  insert into public.shared_settings (id, owner_id, initialized)
  values (1, (select auth.uid()), false)
  on conflict (id) do nothing;

  if not found then
    return;
  end if;

  select owner_id into v_owner_id
  from public.shared_settings
  where id = 1;

  insert into public.ingredients (id, user_id, name, category, unit, price)
  select row_data.id, v_owner_id, row_data.name, row_data.category, row_data.unit, row_data.price
  from jsonb_to_recordset(p_ingredients) as row_data(
    id uuid, name text, category text, unit text, price numeric
  );

  insert into public.dishes (id, user_id, name)
  select row_data.id, v_owner_id, row_data.name
  from jsonb_to_recordset(p_dishes) as row_data(id uuid, name text);

  insert into public.dish_ingredients (user_id, dish_id, ingredient_id, quantity)
  select v_owner_id, row_data.dish_id, row_data.ingredient_id, row_data.quantity
  from jsonb_to_recordset(p_dish_ingredients) as row_data(
    dish_id uuid, ingredient_id uuid, quantity numeric
  );

  update public.shared_settings
  set initialized = true, updated_at = now()
  where id = 1;
end;
$$;

revoke all on function public.save_dish(uuid, text, jsonb) from public, anon;
grant execute on function public.save_dish(uuid, text, jsonb) to authenticated;
revoke all on function public.initialize_meal_plan(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.initialize_meal_plan(jsonb, jsonb, jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_checks'
  ) then
    execute 'alter publication supabase_realtime add table public.shopping_checks';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'meal_plan'
  ) then
    execute 'alter publication supabase_realtime add table public.meal_plan';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ingredients'
  ) then
    execute 'alter publication supabase_realtime add table public.ingredients';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dishes'
  ) then
    execute 'alter publication supabase_realtime add table public.dishes';
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dish_ingredients'
  ) then
    execute 'alter publication supabase_realtime add table public.dish_ingredients';
  end if;
end;
$$;
