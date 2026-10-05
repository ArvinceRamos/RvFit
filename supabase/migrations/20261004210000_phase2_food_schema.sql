create table public.foods (
  id uuid primary key default gen_random_uuid(),
  fdc_id bigint not null unique check (fdc_id > 0),
  source_type text not null check (source_type in ('foundation', 'sr_legacy')),
  name text not null check (char_length(btrim(name)) > 0),
  role text not null check (role in ('protein', 'carb', 'fat', 'vegetable', 'fruit', 'other')),
  preparation_state text not null check (preparation_state in ('raw', 'cooked', 'other')),
  diet_tags text[] not null default '{}'
    check (diet_tags <@ array[
      'meat', 'fish', 'shellfish', 'dairy', 'egg', 'gluten', 'peanuts',
      'tree_nuts', 'soy', 'sesame'
    ]::text[]),
  kcal_per_100g numeric(8, 2) not null check (kcal_per_100g >= 0),
  protein_g_per_100g numeric(8, 2) not null check (protein_g_per_100g >= 0),
  carbs_g_per_100g numeric(8, 2) not null check (carbs_g_per_100g >= 0),
  fat_g_per_100g numeric(8, 2) not null check (fat_g_per_100g >= 0),
  fiber_g_per_100g numeric(8, 2) check (fiber_g_per_100g >= 0),
  created_at timestamptz not null default now()
);

create table public.food_measures (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  label text not null check (char_length(btrim(label)) > 0),
  grams numeric(8, 2) not null check (grams > 0),
  constraint food_measures_food_label_key unique (food_id, label)
);

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  allergy_tags text[] not null default '{}'
    check (allergy_tags <@ array[
      'meat', 'fish', 'shellfish', 'dairy', 'egg', 'gluten', 'peanuts',
      'tree_nuts', 'soy', 'sesame'
    ]::text[]),
  experience text not null check (experience in ('beginner', 'intermediate')),
  equipment text not null check (equipment in ('bodyweight', 'dumbbell_only', 'gym')),
  training_days integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_training_days_check check (
    (experience = 'beginner' and training_days between 2 and 4)
    or (experience = 'intermediate' and training_days between 2 and 6)
  )
);

create table public.user_avoided_foods (
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_date date not null,
  label text not null check (char_length(btrim(label)) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  grams numeric(8, 2) not null check (grams > 0),
  -- maxMealItemGrams is a Phase 2 placeholder. Keep the app guard aligned at 2,000 g.
  constraint meal_items_grams_max_placeholder_check check (grams <= 2000)
);

create index foods_role_preparation_state_idx
  on public.foods (role, preparation_state);

create index food_measures_food_id_idx
  on public.food_measures (food_id);

create index user_avoided_foods_user_id_idx
  on public.user_avoided_foods (user_id);

create index meals_user_date_idx
  on public.meals (user_id, meal_date);

create index meal_items_meal_id_idx
  on public.meal_items (meal_id);

alter table public.foods enable row level security;
alter table public.food_measures enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_avoided_foods enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;

create policy "Authenticated users can read the food catalog"
  on public.foods
  for select
  to authenticated
  using (true);

create policy "Authenticated users can read food measures"
  on public.food_measures
  for select
  to authenticated
  using (true);

create policy "Users can manage their own preferences"
  on public.user_preferences
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own avoided foods"
  on public.user_avoided_foods
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own meals"
  on public.meals
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage items in their own meals"
  on public.meal_items
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.meals
      where meals.id = meal_items.meal_id
        and meals.user_id = (select auth.uid())
    )
  );

revoke all on public.foods, public.food_measures from public, anon, authenticated;
revoke all on public.user_preferences, public.user_avoided_foods, public.meals, public.meal_items
  from public, anon, authenticated;

grant select on public.foods, public.food_measures to authenticated;
grant select, insert, update, delete
  on public.user_preferences, public.user_avoided_foods, public.meals, public.meal_items
  to authenticated;
