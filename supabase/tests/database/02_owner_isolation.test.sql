-- Row-level security: a signed-in user only sees and changes their own rows.
-- User A acts on rows that belong to user B. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(40);

-- Setup as the admin: two users, one food, and one row for B in every user table.
insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@rvfit.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@rvfit.test');

insert into public.foods (id, fdc_id, source_type, name, role, preparation_state,
    kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g)
  values ('f0000000-0000-4000-8000-000000000001', 990000001, 'foundation', 'Test rice', 'carb', 'cooked',
    130, 2.7, 28, 0.3);

insert into public.profiles (user_id, preferred_units, adult_confirmed_at) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'metric', now()),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'metric', now());

insert into public.calorie_targets (id, user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version) values
  ('a1000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', gen_random_uuid(),
    'manual', 2000, 120, 220, 70, 28, 'test'),
  ('b1000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', gen_random_uuid(),
    'manual', 1800, 110, 200, 60, 25, 'test');

insert into public.body_logs (user_id, weight_kg) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 70);
insert into public.user_preferences (user_id, experience, equipment, training_days)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'beginner', 'gym', 3);
insert into public.user_avoided_foods (user_id, food_id)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f0000000-0000-4000-8000-000000000001');
insert into public.meals (id, user_id, meal_date, label)
  values ('b2000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-25', 'Lunch');
insert into public.meal_items (meal_id, food_id, grams)
  values ('b2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 150);
insert into public.workout_logs (id, user_id, template_key, day_key, performed_on) values
  ('a3000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'full-body.beginner.gym', 'day-a', '2026-10-25'),
  ('b3000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'full-body.beginner.gym', 'day-a', '2026-10-25');
insert into public.workout_log_sets (workout_log_id, slot_key, exercise_key, set_number, reps, weight_kg)
  values ('b3000000-0000-4000-8000-000000000001', 'squat', 'goblet-squat', 1, 10, 20);
insert into public.user_exercise_swaps (user_id, template_key, slot_key, exercise_key)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'full-body.beginner.gym', 'squat', 'leg-press');

-- Act as user A.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- A sees none of B's rows.
select is((select count(*)::int from public.profiles where user_id <> auth.uid()), 0, 'A cannot read B''s profile');
select is((select count(*)::int from public.calorie_targets where user_id <> auth.uid()), 0, 'A cannot read B''s targets');
select is((select count(*)::int from public.body_logs), 0, 'A cannot read B''s weigh-ins');
select is((select count(*)::int from public.user_preferences), 0, 'A cannot read B''s preferences');
select is((select count(*)::int from public.user_avoided_foods), 0, 'A cannot read B''s avoided foods');
select is((select count(*)::int from public.meals), 0, 'A cannot read B''s meals');
select is((select count(*)::int from public.meal_items), 0, 'A cannot read B''s meal items');
select is((select count(*)::int from public.workout_logs where user_id <> auth.uid()), 0, 'A cannot read B''s workouts');
select is((select count(*)::int from public.workout_log_sets), 0, 'A cannot read B''s workout sets');
select is((select count(*)::int from public.user_exercise_swaps), 0, 'A cannot read B''s swaps');

-- A sees their own rows and the shared catalog.
select is((select count(*)::int from public.profiles), 1, 'A reads their own profile');
select is((select count(*)::int from public.calorie_targets), 1, 'A reads their own target');
select ok((select count(*) from public.foods) >= 1, 'A reads the food catalog');

-- A cannot write rows for B.
select throws_ok($$insert into public.profiles (user_id, preferred_units, adult_confirmed_at)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'metric', now())
  on conflict (user_id) do update set preferred_units = 'imperial'$$,
  '42501', null, 'A cannot write B''s profile');
select throws_ok($$insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', gen_random_uuid(), 'manual', 2500, 1, 1, 1, 1, 'test')$$,
  '42501', null, 'A cannot add a target for B');
select throws_ok($$insert into public.body_logs (user_id, weight_kg)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 99)$$,
  '42501', null, 'A cannot add a weigh-in for B');
select throws_ok($$insert into public.user_preferences (user_id, experience, equipment, training_days)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'beginner', 'bodyweight', 2)$$,
  '42501', null, 'A cannot add preferences for B');
select throws_ok($$insert into public.user_avoided_foods (user_id, food_id)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'f0000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'A cannot add an avoided food for B');
select throws_ok($$insert into public.meals (user_id, meal_date, label)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-25', 'Dinner')$$,
  '42501', null, 'A cannot add a meal for B');
select throws_ok($$insert into public.meal_items (meal_id, food_id, grams)
  values ('b2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 100)$$,
  '42501', null, 'A cannot add an item to B''s meal');
select throws_ok($$insert into public.workout_logs (user_id, template_key, day_key, performed_on)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'full-body.beginner.gym', 'day-b', '2026-10-25')$$,
  '42501', null, 'A cannot add a workout for B');
select throws_ok($$insert into public.workout_log_sets (workout_log_id, slot_key, exercise_key, set_number, reps)
  values ('b3000000-0000-4000-8000-000000000001', 'squat', 'goblet-squat', 2, 8)$$,
  '42501', null, 'A cannot add a set to B''s workout');
select throws_ok($$insert into public.user_exercise_swaps (user_id, template_key, slot_key, exercise_key)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'full-body.beginner.gym', 'push', 'push-up')$$,
  '42501', null, 'A cannot add a swap for B');

-- A cannot move their own row to B.
select throws_ok($$update public.workout_logs set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  where id = 'a3000000-0000-4000-8000-000000000001'$$,
  '42501', null, 'A cannot hand a workout to B');

-- Updates and deletes aimed at B's rows reach nothing.
select lives_ok($$
  update public.profiles set preferred_units = 'imperial' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  update public.body_logs set weight_kg = 1;
  update public.user_preferences set training_days = 6;
  update public.meals set label = 'Changed';
  update public.meal_items set grams = 1;
  update public.workout_logs set day_key = 'changed' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  update public.workout_log_sets set reps = 1;
  update public.user_exercise_swaps set exercise_key = 'changed'
$$, 'updates aimed at B run without error');
select lives_ok($$
  delete from public.body_logs;
  delete from public.user_preferences;
  delete from public.user_avoided_foods;
  delete from public.meal_items;
  delete from public.meals;
  delete from public.workout_log_sets;
  delete from public.workout_logs where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  delete from public.user_exercise_swaps;
  delete from public.profiles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
$$, 'deletes aimed at B run without error');

-- Saved targets are history: A cannot change or delete even their own.
select throws_ok($$update public.calorie_targets set target_kcal = 900$$,
  '42501', null, 'A cannot change a saved target');
select throws_ok($$delete from public.calorie_targets$$,
  '42501', null, 'A cannot delete a saved target');

-- A can still change and delete their own workout.
select lives_ok($$update public.workout_logs set day_key = 'day-b' where id = 'a3000000-0000-4000-8000-000000000001'$$,
  'A can change their own workout');
select is((select day_key from public.workout_logs where id = 'a3000000-0000-4000-8000-000000000001'), 'day-b',
  'the change to A''s workout is saved');

-- Back to the admin: B's rows are all still there and unchanged.
reset role;
reset "request.jwt.claims";

select is((select preferred_units from public.profiles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'metric', 'B''s profile is unchanged');
select is((select weight_kg from public.body_logs where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  70.00::numeric(6,2), 'B''s weigh-in is unchanged');
select is((select training_days from public.user_preferences where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  3, 'B''s preferences are unchanged');
select is((select count(*)::int from public.user_avoided_foods where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1, 'B''s avoided food is still there');
select is((select label from public.meals where id = 'b2000000-0000-4000-8000-000000000001'),
  'Lunch', 'B''s meal is unchanged');
select is((select grams from public.meal_items where meal_id = 'b2000000-0000-4000-8000-000000000001'),
  150.00::numeric(8,2), 'B''s meal item is unchanged');
select is((select day_key from public.workout_logs where id = 'b3000000-0000-4000-8000-000000000001'),
  'day-a', 'B''s workout is unchanged');
select is((select reps from public.workout_log_sets where workout_log_id = 'b3000000-0000-4000-8000-000000000001'),
  10, 'B''s workout set is unchanged');
select is((select exercise_key from public.user_exercise_swaps where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'leg-press', 'B''s swap is unchanged');
select is((select target_kcal from public.calorie_targets where id = 'a1000000-0000-4000-8000-000000000001'),
  2000, 'A''s saved target is unchanged');

select * from finish();
rollback;
