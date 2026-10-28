-- DESTRUCTIVE REPLACEMENT: this transaction replaces meal-plan data for every currently confirmed Supabase account.
-- It clears existing ingredients, dishes, recipes, weekly plans, and checked shopping items.
-- Then it imports one shared plan and authorizes every confirmed account currently in Supabase Auth.
-- Confirm both partner accounts have confirmed email before running; new accounts are not automatically authorized.
-- Approved source handling: highest price for duplicate names; generic "unit" for blank UoM.
-- This script was generated from the two Anna and Carlos Dishes CSV extracts.
BEGIN;

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

DROP FUNCTION IF EXISTS public.initialize_meal_plan(jsonb, jsonb, jsonb, jsonb, jsonb);

CREATE TEMP TABLE import_ingredients (name text PRIMARY KEY, category text NOT NULL, unit text NOT NULL, price numeric(12,2) NOT NULL) ON COMMIT DROP;
INSERT INTO import_ingredients (name,category,unit,price) VALUES
('Afspændingsmiddel','Clean & Toilettries','unit',12.00),
('Agave Sirop','Dressing','unit',25.00),
('Alcohol Free Beer','Drinks','unit',45.00),
('Almond Milk','Dairy','unit',13.00),
('Almonds','Snacks','unit',50.00),
('Aluminium paper','Clean & Toilettries','unit',15.00),
('Ananas','Fruit & Veggies','unit',20.00),
('Aparragus','Fruit & Veggies','unit',20.00),
('Aperol','Drinks','unit',100.00),
('Apple','Fruit & Veggies','unit',2.00),
('Apple Cider','Dressing','unit',10.00),
('Apple sauce','Can food','unit',10.00),
('Apricots','Snacks','unit',12.00),
('Artichokes','Can food','unit',20.00),
('Asparragus','Fruit & Veggies','unit',22.00),
('Avocado','Fruit & Veggies','unit',9.00),
('Baby finished meals','Misc','unit',15.00),
('Baby formula NAN pro 2','Baby','unit',10.00),
('Baby smothies','Baby','unit',7.00),
('Baby wipes','Clean & Toilettries','unit',15.00),
('Baking paper','Misc','unit',15.00),
('Baking powder','Grains','unit',5.00),
('Balsamic vinegar','Dressing','unit',30.00),
('Bambu','Can food','unit',10.00),
('Banana','Fruit & Veggies','unit',2.50),
('Barista milk','Dairy','unit',12.00),
('Basil','Fruit & Veggies','unit',15.00),
('Basmati Rice','Grains','unit',17.00),
('Beans','Legums','unit',10.00),
('Beer','Drinks','unit',15.00),
('Beet','Fruit & Veggies','unit',15.00),
('Biscuits','grains','unit',20.00),
('Black beans','Can food','unit',10.00),
('Black pepper','Spices','unit',10.00),
('Blueberries','Fruit & Veggies','unit',21.00),
('Brasil nuts','International','unit',20.00),
('Bread','Grains','unit',10.00),
('Bread crumbs','Grains','unit',10.00),
('Brocolli','Fruit & Veggies','unit',15.00),
('Broth','Spices','unit',15.00),
('Brown Sugar','Grains','unit',20.00),
('Brun farin','Misc','unit',20.00),
('Bulgur','Grains','unit',15.00),
('Burger Buns','Grains','unit',20.00),
('Burgers','Fake meat','unit',25.00),
('Butter','Dressing','unit',15.00),
('Butter beans','Can food','unit',7.00),
('Butterdough','Dairy','unit',20.00),
('Cabbage','Fruit & Veggies','unit',15.00),
('Calçots','Fruit & Veggies','unit',5.00),
('Capers','Misc','unit',10.00),
('Cappers','Can food','unit',5.00),
('Caprs','Toppings','unit',10.00),
('Cardamomme','Spices','unit',15.00),
('Carrots','Fruit & Veggies','unit',12.00),
('Cashews','Snacks','unit',50.00),
('Cheak-pea flour','Grains','unit',15.00),
('Cheak-pea pasta','Grains','unit',15.00),
('Cheak-peas','Can food','unit',7.00),
('Cheese slices','Dairy','unit',12.00),
('Cherry tomatoes','Fruit & Veggies','unit',15.00),
('Chia seeds','Seeds','unit',20.00),
('Chili sauce','Dressing','unit',30.00),
('Chilli','Fruit & Veggies','unit',15.00),
('Chips','Snacks','unit',16.00),
('Chocolate','Snacks','unit',15.00),
('Clorin','Clean & Toilettries','unit',15.00),
('Coca-cola','Drinks','unit',30.00),
('Cocoa powder','Grains','unit',15.00),
('Coconut flakes','International','unit',17.00),
('Coconut Milk','Dairy','unit',8.00),
('Coffee','Drinks','unit',40.00),
('Coffee decaff','Misc','unit',70.00),
('Coke','Drinks','unit',15.00),
('Coliflower','Fruit & Veggies','unit',15.00),
('Conditioner','Clean & Toilettries','unit',25.00),
('Condoms','Misc','unit',50.00),
('Coriander','Fruit & Veggies','unit',16.00),
('Corn','Can food','unit',15.00),
('Cous Cous','Grains','unit',9.00),
('Crackers','Snacks','unit',20.00),
('cranberries','Snacks','unit',20.00),
('Cremefresh','Dressing','unit',15.00),
('Crossaint','Snacks','unit',20.00),
('Cucumber','Fruit & Veggies','unit',10.00),
('Curry paste','Spices','unit',15.00),
('D vitamines','Misc','unit',40.00),
('Danskvand','Drinks','unit',10.00),
('Dates','Snacks','unit',28.00),
('Deodorant','Clean & Toilettries','unit',20.00),
('Diapers','Clean & Toilettries','unit',50.00),
('Dishwash soap','Clean & Toilettries','unit',15.00),
('Dishwasher cleaner','Misc','unit',50.00),
('Dishwasher tablets','Clean & Toilettries','unit',30.00),
('Dried mushrooms','Fruit & Veggies','unit',30.00),
('Edamame beans','Fruit & Veggies','unit',13.00),
('Eggplant','Fruit & Veggies','unit',15.00),
('Eggs','Dairy','unit',23.00),
('Eggwhite','Misc','unit',30.00),
('Falafel (pre-made)','Frozen','unit',30.00),
('Falafel spices','Spices','unit',14.00),
('Feta Cheese','Dairy','unit',30.00),
('Filo dough','International','unit',20.00),
('Fire Starters','Misc','unit',17.00),
('Flour','Grains','unit',10.00),
('Fluor','Clean & Toilettries','unit',50.00),
('Foam wipes','Baby','unit',15.00),
('Frozen berries','Frozen','unit',12.00),
('Frozen fruit','Frozen','unit',10.00),
('Frozen spinach','Frozen','unit',13.00),
('Funnel','Fruit & Veggies','unit',15.00),
('Garbage bags','Clean & Toilettries','unit',10.00),
('Garlic','Fruit & Veggies','unit',10.00),
('Garlic powder','Spices','unit',20.00),
('Gazpacho','Fruit & Veggies','unit',15.00),
('Gel','Clean & Toilettries','unit',25.00),
('Gin','Drinks','unit',100.00),
('Ginger','Fruit & Veggies','unit',15.00),
('Gnocchi','Grains','unit',15.00),
('Granola','Misc','unit',50.00),
('Grape fruit','Fruit & Veggies','unit',14.00),
('Grapes','Fruit & Veggies','unit',15.00),
('Green Beans','Frozen','unit',10.00),
('Green Capsicum','Fruit & Veggies','unit',7.50),
('Green peas','Frozen','unit',10.00),
('Groft salt','Misc','unit',10.00),
('Grød','Grains','unit',50.00),
('Grød ris','Grains','unit',10.00),
('Gyoza','International','unit',25.00),
('Gyoza paste','International','unit',17.00),
('Hazelnuts','Snacks','unit',40.00),
('Himalaya salt','Spices','unit',20.00),
('hotdog bread','Grains','unit',10.00),
('Huevos','Lacteos','unit',4.20),
('Hummus','Toppings','unit',15.00),
('Icecream','Dessert','unit',25.00),
('Icecream cones','Dessert','unit',25.00),
('Jack Fruit','Can food','unit',20.00),
('Jackfruit','Can food','unit',15.00),
('Jalapenos','Toppings','unit',12.00),
('Juice','Drinks','unit',12.00),
('Kakao pulver','Misc','unit',30.00),
('Kale','Fruit & Veggies','unit',15.00),
('Kalk fjerner','Clean & Toilettries','unit',20.00),
('Kitchen rolls','Clean & Toilettries','unit',15.00),
('Knekbrød','Grains','unit',25.00),
('Knol Sellery','Fruit & Veggies','unit',15.00),
('Lasagna plates','Grains','unit',15.00),
('Laundry detergent','Clean & Toilettries','unit',50.00),
('Leak','Fruit & Veggies','unit',10.00),
('Lemon','Fruit & Veggies','unit',10.00),
('Lemongrass','International','unit',6.00),
('Lentils','Legums','unit',8.00),
('Lighter','Misc','unit',20.00),
('lighter gas','Misc','unit',40.00),
('Lime','Fruit & Veggies','unit',6.00),
('Lime leaves','International','unit',12.00),
('Mandarines','Fruit & Veggies','unit',25.00),
('Mango','Fruit & Veggies','unit',5.00),
('Maple syrup','Spices','unit',36.00),
('Marcipan','Misc','unit',45.00),
('Mash potatoes','Premade','unit',10.00),
('Mayonese','Dressing','unit',25.00),
('Menstruation pads','Misc','unit',30.00),
('Metal sponge','Clean & Toilettries','unit',15.00),
('Mint leaves','Fruit & Veggies','unit',15.00),
('Miso Paste','Spices','unit',35.00),
('Moneau sauce','Dressing','unit',20.00),
('Mozzarella','Dairy','unit',28.00),
('Muesli','Grains','unit',30.00),
('Mushrooms','Fruit & Veggies','unit',15.00),
('Mustard','Dressing','unit',20.00),
('Mustard powder','Spices','unit',30.00),
('Natron','Clean & Toilettries','unit',10.00),
('Noodles','International','unit',8.00),
('Nutritional yeast','Dairy','unit',80.00),
('Oat Milk','Dairy','unit',13.00),
('Oatmeal','Grains','unit',15.00),
('Olive oil','Dressing','unit',55.00),
('Olives','Can food','unit',10.00),
('Onion','Fruit & Veggies','unit',10.00),
('Oranges','Fruit & Veggies','unit',16.00),
('Oregano','Spices','unit',10.00),
('Oven cleaner','Clean & Toilettries','unit',25.00),
('Pad Thai noodles','International','unit',13.00),
('Paracetamol','Meds','unit',50.00),
('Parmesan Cheese','Dairy','unit',45.00),
('Parsley','Fruit & Veggies','unit',12.00),
('Pasta','Grains','unit',10.00),
('Pasta plates','Grains','unit',10.00),
('Pasta sauce','Can food','unit',15.00),
('Patatas','Frutas y Verduras','unit',1.00),
('Pate','Toppings','unit',13.00),
('Peanutbutter','Toppings','unit',70.00),
('Peanuts','Snacks','unit',12.00),
('Pepper','Dressing','unit',20.00),
('Pesto','Can food','unit',15.00),
('Pickled Cucumber','Can food','unit',20.00),
('Pickled Ginger','International','unit',30.00),
('Pinapple can','Can food','unit',10.00),
('Pizza Dough','Grains','unit',20.00),
('Pletfjerner spray','Clean & Toilettries','unit',20.00),
('Popcorn','Snacks','unit',10.00),
('Potatoes','Fruit & Veggies','unit',12.00),
('Provencal Herbs','Spices','unit',10.00),
('Pumpkin','Fruit & Veggies','unit',15.00),
('Pålæg','Toppings','unit',11.00),
('Quinoa','Grains','unit',20.00),
('Rapsolie','Dressing','unit',12.00),
('Rasins','Snacks','unit',10.00),
('Ravioli','Dairy','unit',20.00),
('Red Capsicum','Fruit & Veggies','unit',7.50),
('Red lentils','Legumes','unit',15.00),
('Red Onion','Fruit & Veggies','unit',15.00),
('Renslet','Clean & Toilettries','unit',10.00),
('Rice milk','Dairy','unit',13.00),
('Rice noodles','International','unit',13.00),
('Rice rolls','International','unit',24.00),
('Rice vinegar','Dressing','unit',20.00),
('rodalon','Clean & Toilettries','unit',25.00),
('Ruccula','Fruit & Veggies','unit',12.00),
('Rugbrød','Grains','unit',20.00),
('Saft','Misc','unit',25.00),
('Salad','Fruit & Veggies','unit',15.00),
('Salt opvaskemaskine','Clean & Toilettries','unit',15.00),
('Salted Almonds','Snacks','unit',17.00),
('Sausages','Fake meat','unit',30.00),
('Schnitzel','Fake meat','unit',20.00),
('Seaweed','International','unit',25.00),
('Seeds','Spices','unit',15.00),
('Sellery','Fruit & Veggies','unit',10.00),
('Sesame Oil','Dressing','unit',45.00),
('Shampoo','Clean & Toilettries','unit',20.00),
('Shitake mushrooms','International','unit',30.00),
('Silken Tofu','International','unit',25.00),
('Sirop','Drinks','unit',55.00),
('Soap','Clean & Toilettries','unit',15.00),
('Softener','Clean & Toilettries','unit',25.00),
('Soy meat dry','International','unit',30.00),
('Soy Milk','Dairy','unit',13.00),
('Soy Sauce','Dressing','unit',55.00),
('Soy Sprouts','Fruit & Veggies','unit',15.00),
('Soy Yoghurt','Dairy','unit',20.00),
('Spagetti','Grains','unit',10.00),
('Spices','Spices','unit',10.00),
('Spidskål','Fruit & Veggies','unit',15.00),
('Spinach','Fruit & Veggies','unit',17.00),
('Spring onions','Fruit & Veggies','unit',12.00),
('Strawberries','Fruit & Veggies','unit',30.00),
('Succini','Fruit & Veggies','unit',10.00),
('Sundried tomatoes','Can food','unit',10.00),
('Sunflower seeds','Seeds','unit',15.00),
('Sunscreen','Misc','unit',79.00),
('Sweet Chili','Dressing','unit',20.00),
('Sweet Potatoes','Fruit & Veggies','unit',15.00),
('Tahini','Dressing','unit',35.00),
('Tappanel','Toppings','unit',12.00),
('Tea','Misc','unit',25.00),
('Tex-mex','Spices','unit',5.00),
('Tofu','Fruit & Veggies','unit',20.00),
('Toilet brush','Clean & Toilettries','unit',100.00),
('Toilete cleaner','Clean & Toilettries','unit',15.00),
('Toilette paper','Clean & Toilettries','unit',25.00),
('Tomato can','Can food','unit',6.00),
('Tomato pure','Can food','unit',4.00),
('Tomato sauce','Dressing','unit',20.00),
('Tomatoes','Fruit & Veggies','unit',15.00),
('Tonic','Drinks','unit',20.00),
('Toothpaste','Clean & Toilettries','unit',15.00),
('Toothpaste kids','Clean & Toilettries','unit',15.00),
('Toothsticks','Clean & Toilettries','unit',20.00),
('Tortillas','Grains','unit',7.00),
('Tuborg classic','Drinks','unit',100.00),
('Valentina','Dressing','unit',25.00),
('Vegan Cheese','Dairy','unit',30.00),
('Vegan Cream','Dairy','unit',20.00),
('Vegan Foie','Toppings','unit',12.00),
('Vegan meatballs','Fake meat','unit',25.00),
('Vegan minsed beef','Fake meat','unit',25.00),
('Wallnuts','Snacks','unit',45.00),
('Wasabi','International','unit',30.00),
('Water 3%','Misc','unit',50.00),
('Water diapers','Baby','unit',70.00),
('Watermelon','Fruit & Veggies','unit',32.00),
('Whiskey','Drinks','unit',200.00),
('White asparragus','Fruit & Veggies','unit',30.00),
('White vinegar','Dressing','unit',25.00),
('Whole Flour','Grains','unit',50.00),
('Wine','Drinks','unit',50.00),
('Worcestershire Sauce','Dressing','unit',20.00),
('Wraps','Grains','unit',10.00),
('Yeast','Dairy','unit',1.00),
('Yogurt','Dairy','unit',25.00),
('Zip plastic bags','Misc','unit',15.00),
('Æblegrød','Grains','unit',25.00);

CREATE TEMP TABLE import_dishes (name text PRIMARY KEY,dish_type text NOT NULL,servings integer NOT NULL,total_price numeric(12,2),price_per_person numeric(12,2),historical_times integer NOT NULL,rating smallint,source_of_recipe text NOT NULL,recipe_notes text NOT NULL,future_food_projects text NOT NULL,main_ingredient text NOT NULL) ON COMMIT DROP;
INSERT INTO import_dishes (name,dish_type,servings,total_price,price_per_person,historical_times,rating,source_of_recipe,recipe_notes,future_food_projects,main_ingredient) VALUES
('Leftovers','',1,0.0,0.0,1601,NULL,'','','Hjemmelavet pølse og seitan steaks','Seitan mel (har allerede)'),
('Vietnamese rolls','International',4,133.0,33.25,65,5,'','','Mozerella ost','Cashews, tapioca pulver, HUSK'),
('Sushi','Rice dishes',4,118.25,29.56,32,5,'','','',''),
('Succini Pizza','Italian',4,83.5,20.88,13,5,'','','Seitan steaks',''),
('Simple salad','Salad',2,64.0,32.0,10,5,'','','',''),
('Pizza','Italian',4,144.0,36.0,56,5,'','','',''),
('Lasagna','Pastas',4,90.2,22.55,41,5,'','','',''),
('Veggie Paella','Rice dishes',4,75.0,18.75,54,4,'','','',''),
('Thai red curry','International',4,58.1,14.53,39,4,'','','',''),
('Spaghetti Carbonara','Pastas',6,72.5,12.08,49,4,'','','',''),
('Sephard''s pie','Potato',4,31.3,7.83,41,4,'','','',''),
('Pad Thai','International',4,109.7,27.43,30,4,'','','',''),
('Mama Meatballs','Main',4,106.0,26.5,32,4,'Trick is oil, extra leek and onion','','',''),
('Dhal','Rice dishes',4,25.3,6.33,54,4,'','','',''),
('Coliflower Tacos','International',2,70.0,35.0,72,4,'','','',''),
('Alu Gobi','International',2,38.0,19.0,23,4,'','','',''),
('Veggie Tacos','International',2,52.0,26.0,2,3,'','','',''),
('Veggie stew','Stew',2,100.0,50.0,1,3,'','','',''),
('Risotto - mushroom','Rice dishes',4,50.0,12.5,18,3,'','','',''),
('Quiche','International',6,143.0,23.83,27,3,'(1) Vegan book from Victor','','',''),
('Pumpkin soup with red lentils','Soups',2,34.4,17.2,10,3,'','','',''),
('Pasta salad','Pastas',2,112.5,56.25,9,3,'','','',''),
('Pasta Bolognese','Pastas',4,69.0,17.25,11,3,'','','',''),
('Okonomiaki','International',4,57.0,14.25,31,3,'','','',''),
('Marry me cheakpeas','Rice dishes',4,80.5,20.13,9,3,'https://plantyou.com/marry-me-chickpeas/','','',''),
('Lentils stew','Potato',4,29.9,7.48,32,3,'','','',''),
('Leak-Potato soup','Soups',4,42.0,10.5,20,3,'','https://www.cilantroandcitronella.com/vegan-ramen/','',''),
('Indian creamy curry','International',4,77.0,19.25,19,3,'','','',''),
('Hummus','Snacks',4,35.5,8.88,10,3,'','','',''),
('Grill party','Grill',2,84.5,42.25,11,3,'','','',''),
('Gnocchi','Main',2,95.0,47.5,13,3,'','','',''),
('Gazpacho','Spanish',4,58.0,14.5,13,3,'','','',''),
('Fried noodles','Pastas',4,50.1,12.53,23,3,'','','',''),
('Falafel wrap','Sandwich',2,99.9,49.95,54,3,'Air Fryer Falafel Recipe (Gluten-Free, Vegan) - Elavegan','','',''),
('Coconut curry ramen','Soup',4,87.0,21.75,3,3,'','','',''),
('Chilli sin carne','International',2,120.8,60.4,29,3,'','','',''),
('Burritos','Snacks',4,34.2,8.55,8,3,'','','',''),
('Budha Bowl','',2,57.0,28.5,3,3,'','','',''),
('Vegan sausages','Main',4,96.0,24.0,13,2,'Vegan Sausage Recipe | Gluten-Free Veggie Bratwurst - Elavegan','','',''),
('Tortilla de patatas','Tapas',4,70.6,17.65,10,2,'','','',''),
('Stuffed Sweet Potatoes','Main',2,90.1,45.05,3,2,'','','',''),
('Stir fry veggies','Main',4,87.2,21.8,4,2,'VEGAN the cookbook','','',''),
('Samosas','Tapas',4,105.0,26.25,3,2,'','','',''),
('Quinoa and bean burger','Main',4,43.5,10.88,13,2,'','','',''),
('Quick Lasagna','Main',2,89.0,44.5,2,2,'','','',''),
('Pumpkin salad','Salad',2,42.5,21.25,7,2,'','','',''),
('Potato Gratini','Main',4,53.6,13.4,4,2,'(1) Vegan book from Victor','','',''),
('Pizza rolls','Snacks',4,86.5,21.63,3,2,'','','',''),
('Pattie burgers + Veggies','Potato',2,37.0,18.5,23,2,'','','',''),
('Onion Soup','Soup',2,25.0,12.5,1,2,'','','',''),
('Nachos with vegan cheese','Snacks',4,106.7,26.68,8,2,'','','',''),
('Mushroom garlic pasta','Pastas',4,45.3,11.33,10,2,'','','',''),
('Miso Soup','Soups',4,65.5,16.38,8,2,'https://sixhungryfeet.com/easy-vegan-miso-ramen/','','',''),
('Mashed potatoes and meatballs','Main',2,80.5,40.25,11,2,'Easy Vegetarian Swedish Meatballs – Skinny Spatula','','',''),
('Lentils salad','Salad',2,31.4,15.7,10,2,'','','',''),
('Kale + Cheakpeas salad','Salad',2,35.3,17.65,16,2,'','','',''),
('Granola','Snacks',4,95.5,23.88,5,2,'','','',''),
('Date balls','Snacks',8,83.0,10.38,4,2,'','','',''),
('Classic Salad','Salad',4,42.25,10.56,14,2,'','','',''),
('Chickpea salad','Salad',2,31.55,15.78,3,2,'','','',''),
('Chickpea and veg. tagine','Main',4,86.0,21.5,2,2,'VEGAN the cookbook','','',''),
('Cabbage + peas salad','Salad',2,42.0,21.0,7,2,'','','',''),
('Black bean burger','Main',4,62.4,15.6,14,2,'https://elavegan.com/vegan-black-bean-burger/#recipe','','',''),
('Beans + potatoes + schnitzels','Potato',2,36.0,18.0,35,2,'','','',''),
('Arros a la Cubana','Rice dishes',4,50.0,12.5,17,2,'','','',''),
('Usual Breakfast','Starters',2,17.55,8.78,0,1,'','','',''),
('Tomato Soup','Soup',2,84.5,42.25,2,1,'Best Tomato Soup Recipe - JoyFoodSunshine','','',''),
('Quesadillas','Starters',2,54.5,27.25,2,1,'','','',''),
('Meatballs with cabbage','Main',4,32.5,8.13,2,1,'Deller med Stuvet Hvidkål (mitveganskekokken.blogspot.com)','','',''),
('Lunch with rugbrød','Bread',2,19.0,9.5,13,1,'','','','');

CREATE TEMP TABLE import_recipe_lines (dish_name text NOT NULL,ingredient_name text NOT NULL,quantity numeric(12,3) NOT NULL,PRIMARY KEY(dish_name,ingredient_name)) ON COMMIT DROP;
INSERT INTO import_recipe_lines (dish_name,ingredient_name,quantity) VALUES
('Vietnamese rolls','Rice rolls',1.500),
('Vietnamese rolls','Soy Sauce',0.200),
('Vietnamese rolls','Rice noodles',2.000),
('Vietnamese rolls','Soy Sprouts',1.000),
('Vietnamese rolls','Coriander',0.500),
('Vietnamese rolls','Chilli',1.000),
('Vietnamese rolls','Tofu',0.500),
('Vietnamese rolls','Salad',0.300),
('Vietnamese rolls','Mint leaves',0.500),
('Sushi','Grød ris',0.500),
('Sushi','Avocado',1.000),
('Sushi','Seaweed',1.000),
('Sushi','Wasabi',0.500),
('Sushi','Soy Sauce',0.250),
('Sushi','Sweet Potatoes',1.000),
('Sushi','Tofu',1.000),
('Sushi','Pickled Ginger',0.200),
('Sushi','Mushrooms',0.500),
('Sushi','Rice vinegar',0.100),
('Succini Pizza','Pizza Dough',2.000),
('Succini Pizza','Succini',1.000),
('Succini Pizza','Parmesan Cheese',0.500),
('Succini Pizza','Onion',0.500),
('Succini Pizza','Ruccula',0.500),
('Simple salad','Salad',1.000),
('Simple salad','Tomatoes',2.000),
('Simple salad','Olives',0.200),
('Simple salad','Red Onion',1.000),
('Simple salad','Mustard',0.100),
('Pizza','Pizza Dough',2.000),
('Pizza','Red Capsicum',1.000),
('Pizza','Tomato can',3.000),
('Pizza','Onion',0.200),
('Pizza','Garlic',0.200),
('Pizza','Mozzarella',1.000),
('Pizza','Artichokes',1.000),
('Pizza','Olives',1.000),
('Pizza','Ruccula',1.000),
('Pizza','Mushrooms',0.300),
('Lasagna','Pasta plates',0.500),
('Lasagna','Red Capsicum',1.000),
('Lasagna','Lentils',0.300),
('Lasagna','Onion',0.200),
('Lasagna','Succini',1.000),
('Lasagna','Tomato can',3.000),
('Lasagna','Mushrooms',1.000),
('Lasagna','Soy Milk',0.100),
('Lasagna','Butter',1.000),
('Lasagna','Mozzarella',0.500),
('Veggie Paella','Red Capsicum',1.000),
('Veggie Paella','Green Capsicum',1.000),
('Veggie Paella','Aparragus',1.000),
('Veggie Paella','Garlic',0.100),
('Veggie Paella','Olive oil',0.200),
('Veggie Paella','Grød ris',0.500),
('Veggie Paella','Broth',0.200),
('Veggie Paella','Artichokes',1.000),
('Thai red curry','Curry paste',0.500),
('Thai red curry','Coconut Milk',1.000),
('Thai red curry','Carrots',0.500),
('Thai red curry','Onion',0.200),
('Thai red curry','Brocolli',1.000),
('Thai red curry','Garlic',0.100),
('Thai red curry','Chilli',1.000),
('Thai red curry','Lemongrass',0.200),
('Thai red curry','Lime leaves',0.200),
('Spaghetti Carbonara','Cashews',0.500),
('Spaghetti Carbonara','Green peas',0.500),
('Spaghetti Carbonara','Nutritional yeast',0.100),
('Spaghetti Carbonara','Mushrooms',1.000),
('Spaghetti Carbonara','Spagetti',0.500),
('Spaghetti Carbonara','Garlic',0.200),
('Spaghetti Carbonara','Coconut flakes',0.200),
('Spaghetti Carbonara','Maple syrup',0.100),
('Spaghetti Carbonara','Soy Sauce',0.100),
('Sephard''s pie','Potatoes',1.000),
('Sephard''s pie','Lentils',0.300),
('Sephard''s pie','Mushrooms',0.500),
('Sephard''s pie','Carrots',0.200),
('Sephard''s pie','Onion',0.200),
('Sephard''s pie','Garlic',0.200),
('Sephard''s pie','Broth',0.200),
('Pad Thai','Pad Thai noodles',1.000),
('Pad Thai','Tofu',1.000),
('Pad Thai','Red Capsicum',1.000),
('Pad Thai','Soy Sprouts',1.000),
('Pad Thai','Coriander',0.500),
('Pad Thai','Chilli',1.000),
('Pad Thai','Lime',2.000),
('Pad Thai','Carrots',0.500),
('Pad Thai','Spring onions',1.000),
('Pad Thai','Peanuts',0.100),
('Mama Meatballs','Basmati Rice',0.500),
('Mama Meatballs','Onion',0.500),
('Mama Meatballs','Garlic',0.100),
('Mama Meatballs','Olive oil',0.200),
('Mama Meatballs','Vegan meatballs',1.000),
('Mama Meatballs','Tomato pure',1.000),
('Mama Meatballs','Carrots',2.000),
('Mama Meatballs','Leak',1.000),
('Mama Meatballs','Green peas',1.000),
('Mama Meatballs','Broth',0.500),
('Dhal','Red lentils',0.500),
('Dhal','Basmati Rice',0.500),
('Dhal','Onion',0.100),
('Dhal','Garlic',0.100),
('Dhal','Ginger',0.100),
('Dhal','Spices',0.100),
('Dhal','Coriander',0.300),
('Coliflower Tacos','Coliflower',1.000),
('Coliflower Tacos','Tex-mex',0.500),
('Coliflower Tacos','Avocado',1.000),
('Coliflower Tacos','Tomatoes',1.000),
('Coliflower Tacos','Coriander',0.500),
('Coliflower Tacos','Red Onion',0.500),
('Coliflower Tacos','Lime',1.000),
('Coliflower Tacos','Tortillas',1.000),
('Alu Gobi','Potatoes',0.500),
('Alu Gobi','Coliflower',1.000),
('Alu Gobi','Garlic',0.200),
('Alu Gobi','Ginger',0.200),
('Alu Gobi','Tomato can',2.000),
('Veggie Tacos','Red Capsicum',2.000),
('Veggie Tacos','Tex-mex',0.500),
('Veggie Tacos','Avocado',1.000),
('Veggie Tacos','Succini',1.000),
('Veggie Tacos','Coriander',0.500),
('Veggie Tacos','Red Onion',0.500),
('Veggie stew','Mash potatoes',1.000),
('Veggie stew','Mushrooms',1.000),
('Veggie stew','Onion',1.000),
('Veggie stew','Vegan Cream',1.000),
('Veggie stew','Knol Sellery',1.000),
('Veggie stew','Sausages',1.000),
('Risotto - mushroom','Grød ris',0.300),
('Risotto - mushroom','Aparragus',1.000),
('Risotto - mushroom','Quinoa',0.200),
('Risotto - mushroom','Mushrooms',1.000),
('Risotto - mushroom','Broth',0.200),
('Risotto - mushroom','Wine',0.100),
('Quiche','Butterdough',1.000),
('Quiche','Tofu',1.000),
('Quiche','Spring onions',0.500),
('Quiche','Mushrooms',0.200),
('Quiche','Vegan Cream',0.500),
('Quiche','Eggs',3.000),
('Quiche','Cherry tomatoes',1.000),
('Pumpkin soup with red lentils','Pumpkin',0.500),
('Pumpkin soup with red lentils','Potatoes',0.200),
('Pumpkin soup with red lentils','Broth',0.300),
('Pumpkin soup with red lentils','Vegan Cream',1.000),
('Pasta salad','Pasta',6.000),
('Pasta salad','Tomatoes',0.200),
('Pasta salad','Corn',0.500),
('Pasta salad','Red Onion',1.000),
('Pasta salad','Cheak-peas',1.000),
('Pasta salad','Olives',1.000),
('Pasta salad','Cucumber',1.000),
('Pasta Bolognese','Pasta',1.000),
('Pasta Bolognese','Lentils',1.000),
('Pasta Bolognese','Succini',1.000),
('Pasta Bolognese','Onion',1.000),
('Pasta Bolognese','Tomato can',1.000),
('Pasta Bolognese','Garlic',1.000),
('Pasta Bolognese','Mushrooms',1.000),
('Okonomiaki','Spidskål',1.000),
('Okonomiaki','Flour',1.000),
('Okonomiaki','Carrots',0.500),
('Okonomiaki','Onion',0.200),
('Okonomiaki','Eggs',1.000),
('Okonomiaki','Garlic',0.100),
('Marry me cheakpeas','Cheak-peas',2.000),
('Marry me cheakpeas','Coconut Milk',1.000),
('Marry me cheakpeas','Sundried tomatoes',1.000),
('Marry me cheakpeas','Tomato pure',1.000),
('Marry me cheakpeas','Onion',0.200),
('Marry me cheakpeas','Garlic',0.200),
('Marry me cheakpeas','Spinach',1.000),
('Marry me cheakpeas','Broth',1.000),
('Marry me cheakpeas','Basmati Rice',0.500),
('Lentils stew','Lentils',0.300),
('Lentils stew','Potatoes',0.500),
('Lentils stew','Carrots',0.500),
('Lentils stew','Red Capsicum',1.000),
('Lentils stew','Garlic',0.100),
('Lentils stew','Broth',0.200),
('Lentils stew','Tomato pure',1.000),
('Leak-Potato soup','Potatoes',1.000),
('Leak-Potato soup','Leak',2.000),
('Leak-Potato soup','Succini',1.000),
('Indian creamy curry','Butter',1.000),
('Indian creamy curry','Tomato can',1.000),
('Indian creamy curry','Chilli',1.000),
('Indian creamy curry','Ginger',1.000),
('Indian creamy curry','Garlic',1.000),
('Indian creamy curry','Red Capsicum',1.000),
('Indian creamy curry','Basmati Rice',0.500),
('Hummus','Cheak-peas',1.000),
('Hummus','Lemon',2.000),
('Hummus','Garlic',0.100),
('Hummus','Olive oil',0.100),
('Grill party','Sausages',1.000),
('Grill party','Potatoes',1.000),
('Grill party','Red Capsicum',1.000),
('Grill party','Eggplant',1.000),
('Grill party','Succini',1.000),
('Grill party','hotdog bread',1.000),
('Gnocchi','Onion',0.500),
('Gnocchi','Vegan Cream',1.000),
('Gnocchi','Cherry tomatoes',1.000),
('Gnocchi','Mushrooms',1.000),
('Gnocchi','Gnocchi',2.000),
('Gnocchi','Succini',1.000),
('Gazpacho','Tomatoes',2.000),
('Gazpacho','Garlic',1.000),
('Gazpacho','White vinegar',0.200),
('Gazpacho','Green Capsicum',1.000),
('Gazpacho','Olive oil',0.100),
('Fried noodles','Spagetti',0.800),
('Fried noodles','Onion',0.200),
('Fried noodles','Carrots',0.300),
('Fried noodles','Succini',0.500),
('Fried noodles','Red Capsicum',1.000),
('Fried noodles','Brocolli',1.000),
('Fried noodles','Sesame Oil',0.200),
('Falafel wrap','Wraps',0.500),
('Falafel wrap','Red Capsicum',1.000),
('Falafel wrap','Salad',1.000),
('Falafel wrap','Hummus',1.000),
('Falafel wrap','Cucumber',0.500),
('Falafel wrap','Soy Yoghurt',1.000),
('Falafel wrap','Cheak-peas',2.000),
('Falafel wrap','Red Onion',1.000),
('Falafel wrap','Parsley',0.200),
('Falafel wrap','Garlic',0.100),
('Coconut curry ramen','Coconut Milk',2.000),
('Coconut curry ramen','Broth',1.000),
('Coconut curry ramen','Tofu',1.000),
('Coconut curry ramen','Curry paste',0.200),
('Coconut curry ramen','Miso Paste',0.200),
('Coconut curry ramen','Noodles',1.000),
('Coconut curry ramen','Mushrooms',1.000),
('Coconut curry ramen','Ginger',0.200),
('Chilli sin carne','Beans',1.000),
('Chilli sin carne','Tomato can',2.000),
('Chilli sin carne','Chocolate',0.200),
('Chilli sin carne','Coriander',1.000),
('Chilli sin carne','Corn',1.000),
('Chilli sin carne','Eggplant',1.000),
('Chilli sin carne','Succini',1.000),
('Chilli sin carne','Sweet Potatoes',1.000),
('Chilli sin carne','Sundried tomatoes',1.000),
('Chilli sin carne','Cremefresh',1.000),
('Burritos','Tortillas',0.500),
('Burritos','Basmati Rice',0.500),
('Burritos','Onion',1.000),
('Burritos','Succini',0.100),
('Burritos','Tomato can',1.000),
('Burritos','Coriander',0.200),
('Budha Bowl','Quinoa',0.200),
('Budha Bowl','Avocado',2.000),
('Budha Bowl','Sweet Potatoes',1.000),
('Budha Bowl','Edamame beans',0.500),
('Budha Bowl','Red Capsicum',1.000),
('Budha Bowl','Lime',1.000),
('Vegan sausages','Chia seeds',0.200),
('Vegan sausages','Beans',0.100),
('Vegan sausages','Sundried tomatoes',0.100),
('Vegan sausages','Oatmeal',1.000),
('Vegan sausages','Onion',1.000),
('Vegan sausages','Garlic',2.000),
('Vegan sausages','Wallnuts',1.000),
('Tortilla de patatas','Potatoes',0.800),
('Tortilla de patatas','Onion',0.200),
('Tortilla de patatas','Succini',1.000),
('Tortilla de patatas','Olive oil',0.200),
('Tortilla de patatas','Eggs',1.000),
('Tortilla de patatas','Tomatoes',1.000),
('Stuffed Sweet Potatoes','Sweet Potatoes',2.000),
('Stuffed Sweet Potatoes','Beans',1.000),
('Stuffed Sweet Potatoes','Red Capsicum',1.000),
('Stuffed Sweet Potatoes','Onion',1.000),
('Stuffed Sweet Potatoes','Spring onions',1.000),
('Stuffed Sweet Potatoes','Corn',1.000),
('Stuffed Sweet Potatoes','Mozzarella',0.200),
('Stir fry veggies','Onion',0.200),
('Stir fry veggies','Spagetti',1.000),
('Stir fry veggies','Carrots',2.000),
('Stir fry veggies','Succini',1.000),
('Stir fry veggies','Shitake mushrooms',1.000),
('Stir fry veggies','Soy Sauce',0.200),
('Samosas','Potatoes',0.500),
('Samosas','Onion',2.000),
('Samosas','Coliflower',1.000),
('Samosas','Green peas',0.200),
('Samosas','Ginger',0.200),
('Samosas','Flour',0.200),
('Samosas','Baking powder',0.200),
('Samosas','Garlic',2.000),
('Samosas','Coriander',1.000),
('Samosas','Filo dough',1.000),
('Quinoa and bean burger','Quinoa',0.200),
('Quinoa and bean burger','Olive oil',0.100),
('Quinoa and bean burger','Bread crumbs',0.100),
('Quinoa and bean burger','Beans',1.000),
('Quinoa and bean burger','Eggs',1.000),
('Quick Lasagna','Pasta plates',0.500),
('Quick Lasagna','Mushrooms',1.000),
('Quick Lasagna','Moneau sauce',1.000),
('Quick Lasagna','Vegan Cheese',1.000),
('Quick Lasagna','Frozen spinach',1.000),
('Quick Lasagna','Onion',0.500),
('Quick Lasagna','Garlic',0.100),
('Pumpkin salad','Salad',1.000),
('Pumpkin salad','Pumpkin',0.500),
('Pumpkin salad','Tomatoes',0.200),
('Pumpkin salad','Red Onion',1.000),
('Pumpkin salad','Mustard',0.100),
('Potato Gratini','Potatoes',0.500),
('Potato Gratini','Succini',1.000),
('Potato Gratini','Cashews',0.100),
('Potato Gratini','Soy Milk',0.200),
('Potato Gratini','Mushrooms',1.000),
('Potato Gratini','Onion',1.000),
('Potato Gratini','Garlic',0.500),
('Pizza rolls','Flour',0.500),
('Pizza rolls','Yeast',0.500),
('Pizza rolls','Onion',1.000),
('Pizza rolls','Garlic',0.100),
('Pizza rolls','Tomato can',2.000),
('Pizza rolls','Mozzarella',1.000),
('Pizza rolls','Artichokes',1.000),
('Pizza rolls','Olives',1.000),
('Pattie burgers + Veggies','Schnitzel',1.000),
('Pattie burgers + Veggies','Potatoes',0.500),
('Pattie burgers + Veggies','Carrots',0.500),
('Pattie burgers + Veggies','Onion',0.200),
('Pattie burgers + Veggies','Provencal Herbs',0.300),
('Onion Soup','Onion',1.000),
('Onion Soup','Broth',1.000),
('Nachos with vegan cheese','Chips',2.000),
('Nachos with vegan cheese','Beans',2.000),
('Nachos with vegan cheese','Tomatoes',1.000),
('Nachos with vegan cheese','Red Onion',1.000),
('Nachos with vegan cheese','Coriander',0.200),
('Nachos with vegan cheese','Cashews',0.300),
('Nachos with vegan cheese','Red Capsicum',1.000),
('Mushroom garlic pasta','Spagetti',1.000),
('Mushroom garlic pasta','Mushrooms',0.500),
('Mushroom garlic pasta','Garlic',0.250),
('Mushroom garlic pasta','Olive oil',0.100),
('Mushroom garlic pasta','Parsley',0.400),
('Mushroom garlic pasta','Chilli',1.000),
('Miso Soup','Miso Paste',0.100),
('Miso Soup','Broth',1.000),
('Miso Soup','Tofu',1.000),
('Miso Soup','Spring onions',1.000),
('Miso Soup','Leak',0.200),
('Miso Soup','Mushrooms',0.300),
('Miso Soup','Kale',0.500),
('Mashed potatoes and meatballs','Potatoes',1.000),
('Mashed potatoes and meatballs','Bulgur',0.500),
('Mashed potatoes and meatballs','Shitake mushrooms',0.200),
('Mashed potatoes and meatballs','Cheak-peas',1.000),
('Mashed potatoes and meatballs','Soy Yoghurt',0.100),
('Mashed potatoes and meatballs','Bread crumbs',0.100),
('Mashed potatoes and meatballs','Eggs',1.000),
('Mashed potatoes and meatballs','Vegan Cream',1.000),
('Mashed potatoes and meatballs','Mustard',0.100),
('Lentils salad','Lentils',1.000),
('Lentils salad','Cucumber',1.000),
('Lentils salad','Parsley',0.200),
('Lentils salad','Balsamic vinegar',0.100),
('Lentils salad','Red Onion',0.200),
('Lentils salad','Olive oil',0.100),
('Kale + Cheakpeas salad','Cheak-peas',1.000),
('Kale + Cheakpeas salad','Kale',0.500),
('Kale + Cheakpeas salad','Tomatoes',0.200),
('Kale + Cheakpeas salad','Red Onion',1.000),
('Kale + Cheakpeas salad','Dates',0.100),
('Granola','Oatmeal',1.000),
('Granola','Almonds',0.500),
('Granola','Tahini',0.500),
('Granola','Dates',1.000),
('Granola','Rasins',1.000),
('Date balls','Dates',1.000),
('Date balls','Oatmeal',0.500),
('Date balls','Coconut Milk',1.000),
('Date balls','Lemon',1.000),
('Date balls','Chocolate',1.000),
('Date balls','Cocoa powder',0.100),
('Date balls','Peanutbutter',0.200),
('Classic Salad','Salad',1.000),
('Classic Salad','Cherry tomatoes',1.000),
('Classic Salad','Cheak-peas',1.000),
('Classic Salad','Tahini',0.150),
('Chickpea salad','Salad',0.500),
('Chickpea salad','Cheak-peas',1.000),
('Chickpea salad','Wallnuts',0.050),
('Chickpea salad','Dates',0.100),
('Chickpea salad','Avocado',0.500),
('Chickpea salad','Tomatoes',0.500),
('Chickpea and veg. tagine','Onion',2.000),
('Chickpea and veg. tagine','Cheak-peas',1.000),
('Chickpea and veg. tagine','Carrots',2.000),
('Chickpea and veg. tagine','Succini',1.000),
('Chickpea and veg. tagine','Cous Cous',1.000),
('Chickpea and veg. tagine','Mint leaves',0.200),
('Chickpea and veg. tagine','Lemon',1.000),
('Chickpea and veg. tagine','Broth',0.200),
('Cabbage + peas salad','Cabbage',1.000),
('Cabbage + peas salad','Green peas',0.500),
('Cabbage + peas salad','Mayonese',0.200),
('Cabbage + peas salad','Red Onion',1.000),
('Cabbage + peas salad','Mustard',0.100),
('Black bean burger','Chia seeds',0.200),
('Black bean burger','Beans',0.100),
('Black bean burger','Tomato pure',0.100),
('Black bean burger','Oatmeal',1.000),
('Black bean burger','Onion',1.000),
('Black bean burger','Garlic',2.000),
('Black bean burger','Parsley',1.000),
('Beans + potatoes + schnitzels','Green Beans',1.000),
('Beans + potatoes + schnitzels','Potatoes',0.500),
('Beans + potatoes + schnitzels','Schnitzel',1.000),
('Arros a la Cubana','Grød ris',0.500),
('Arros a la Cubana','Tomato can',3.000),
('Arros a la Cubana','Onion',0.200),
('Arros a la Cubana','Garlic',0.200),
('Arros a la Cubana','Eggs',1.000),
('Usual Breakfast','Hummus',0.200),
('Usual Breakfast','Avocado',0.200),
('Usual Breakfast','Flour',0.100),
('Usual Breakfast','Yeast',0.100),
('Usual Breakfast','Oatmeal',0.050),
('Usual Breakfast','Vegan Foie',0.100),
('Usual Breakfast','Tappanel',0.100),
('Usual Breakfast','Almonds',0.100),
('Usual Breakfast','Seeds',0.100),
('Usual Breakfast','Coffee',0.050),
('Tomato Soup','Tomatoes',4.000),
('Tomato Soup','Garlic',0.200),
('Tomato Soup','Carrots',0.500),
('Tomato Soup','Potatoes',0.500),
('Tomato Soup','Onion',0.300),
('Tomato Soup','Kale',0.500),
('Quesadillas','Beans',1.000),
('Quesadillas','Vegan Cheese',1.000),
('Quesadillas','Red Capsicum',1.000),
('Quesadillas','Tortillas',1.000),
('Meatballs with cabbage','Potatoes',1.000),
('Meatballs with cabbage','Cabbage',1.000),
('Meatballs with cabbage','Red lentils',0.200),
('Meatballs with cabbage','Oatmeal',0.100),
('Meatballs with cabbage','Flour',0.100),
('Lunch with rugbrød','Rugbrød',0.200),
('Lunch with rugbrød','Avocado',0.500),
('Lunch with rugbrød','Hummus',0.300),
('Lunch with rugbrød','Cucumber',0.300),
('Lunch with rugbrød','Tomatoes',0.200);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Create the household accounts in Supabase Auth before running this import';
  END IF;
  IF EXISTS (SELECT 1 FROM import_recipe_lines r LEFT JOIN import_dishes d ON lower(d.name)=lower(r.dish_name) LEFT JOIN import_ingredients i ON lower(i.name)=lower(r.ingredient_name) WHERE d.name IS NULL OR i.name IS NULL) THEN
    RAISE EXCEPTION 'A recipe ingredient does not match the imported source data';
  END IF;
END;
$$;

INSERT INTO public.household_members (user_id) SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL ON CONFLICT (user_id) DO NOTHING;
CREATE TEMP TABLE import_owner (owner_id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO import_owner SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL ORDER BY created_at,id LIMIT 1;

DELETE FROM public.meal_plan;
DELETE FROM public.shopping_checks;
DELETE FROM public.dish_ingredients;
DELETE FROM public.dishes;
DELETE FROM public.ingredients;

ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_user_id_day_dish_id_key;
ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_day_dish_key;
ALTER TABLE public.meal_plan DROP CONSTRAINT IF EXISTS meal_plan_day_dish_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS meal_plan_shared_day_dish_idx ON public.meal_plan(day,dish_id);
CREATE UNIQUE INDEX IF NOT EXISTS shopping_checks_shared_key_idx ON public.shopping_checks(check_key);

INSERT INTO public.shared_settings (id,owner_id,initialized) SELECT 1,owner_id,true FROM import_owner
ON CONFLICT (id) DO UPDATE SET owner_id=excluded.owner_id,initialized=true,updated_at=now();

INSERT INTO public.ingredients (id,user_id,name,category,unit,price)
SELECT gen_random_uuid(),o.owner_id,i.name,i.category,i.unit,i.price FROM import_ingredients i CROSS JOIN import_owner o;
INSERT INTO public.dishes (id,user_id,name,dish_type,servings,total_price,price_per_person,historical_times,rating,source_of_recipe,recipe_notes,future_food_projects,main_ingredient)
SELECT gen_random_uuid(),o.owner_id,d.name,d.dish_type,d.servings,d.total_price,d.price_per_person,d.historical_times,d.rating,d.source_of_recipe,d.recipe_notes,d.future_food_projects,d.main_ingredient FROM import_dishes d CROSS JOIN import_owner o;
INSERT INTO public.dish_ingredients (user_id,dish_id,ingredient_id,quantity)
SELECT o.owner_id,d.id,i.id,r.quantity FROM import_recipe_lines r
JOIN public.dishes d ON lower(d.name)=lower(r.dish_name)
JOIN public.ingredients i ON lower(i.name)=lower(r.ingredient_name)
CROSS JOIN import_owner o WHERE d.user_id=o.owner_id AND i.user_id=o.owner_id;

DO $$
DECLARE expected integer; actual integer;
BEGIN
  SELECT count(*) INTO expected FROM import_recipe_lines;
  SELECT count(*) INTO actual FROM public.dish_ingredients;
  IF actual<>expected THEN RAISE EXCEPTION 'Imported % of % recipe ingredient mappings',actual,expected; END IF;
END;
$$;

COMMIT;
