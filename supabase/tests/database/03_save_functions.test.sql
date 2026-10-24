-- The 5 save functions: who may call them, what they refuse, and what they write.
-- Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@rvfit.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@rvfit.test');

insert into public.foods (id, fdc_id, source_type, name, role, preparation_state,
    kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g)
  values ('f0000000-0000-4000-8000-000000000001', 990000001, 'foundation', 'Test rice', 'carb', 'cooked',
    130, 2.7, 28, 0.3);

-- Shared arguments, kept in a temporary table so each call stays short.
create temporary table args on commit drop as select
  '{"age_years": 30, "sex_formula_branch": "male", "height_cm": 175, "activity_level": "moderate",
    "preferred_units": "metric", "adult_confirmed_at": "2026-10-25T00:00:00Z"}'::jsonb as profile,
  '{"source": "calculated", "target_kcal": 2400, "goal": "maintain", "protein_g": 130, "carbs_g": 290,
    "fat_g": 80, "fiber_g": 34, "formula_branch": "male", "config_version": "test"}'::jsonb as target,
  '{"weight_kg": 80}'::jsonb as body_log,
  '[{"food_id": "f0000000-0000-4000-8000-000000000001", "grams": 150}]'::jsonb as one_item,
  '[{"slot_key": "squat", "exercise_key": "goblet-squat", "set_number": 1, "reps": 10, "weight_kg": 20},
    {"slot_key": "squat", "exercise_key": "goblet-squat", "set_number": 2, "reps": 8, "weight_kg": 20}]'::jsonb as two_sets;
grant select on args to authenticated;

-- Guests cannot call any save function.
set local role anon;
select throws_ok($$select public.save_initial_guest_draft(gen_random_uuid(), gen_random_uuid(), '{}', '{}', '{}')$$,
  '42501', null, 'anon cannot call save_initial_guest_draft');
select throws_ok($$select public.save_meal(null, '2026-10-25', 'Lunch', '[]')$$,
  '42501', null, 'anon cannot call save_meal');
select throws_ok($$select public.save_meal_plan('[]')$$,
  '42501', null, 'anon cannot call save_meal_plan');
select throws_ok($$select public.save_profile_and_target('{}', '{}', null)$$,
  '42501', null, 'anon cannot call save_profile_and_target');
select throws_ok($$select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-25', '[]')$$,
  '42501', null, 'anon cannot call save_workout_log');
reset role;

-- The authenticated role with no user in the token is refused too.
set local role authenticated;
select throws_ok($$select public.save_initial_guest_draft(gen_random_uuid(), gen_random_uuid(), '{}', '{}', '{}')$$,
  '42501', null, 'save_initial_guest_draft needs a signed-in user');
select throws_ok($$select public.save_meal(null, '2026-10-25', 'Lunch', (select one_item from args))$$,
  '42501', null, 'save_meal needs a signed-in user');
select throws_ok($$select public.save_meal_plan('[]')$$,
  '42501', null, 'save_meal_plan needs a signed-in user');
select throws_ok($$select public.save_profile_and_target('{}', '{}', null)$$,
  '42501', null, 'save_profile_and_target needs a signed-in user');
select throws_ok($$select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-25', '[]')$$,
  '42501', null, 'save_workout_log needs a signed-in user');

-- From here on, act as user A.
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- save_initial_guest_draft: the first saved target, once per account.
select throws_ok($$select public.save_initial_guest_draft('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    gen_random_uuid(), profile, target, body_log) from args$$,
  '42501', null, 'A cannot save a first target for B');
select is((select public.save_initial_guest_draft(auth.uid(), 'd0000000-0000-4000-8000-000000000001',
    profile, target, body_log) ->> 'status' from args),
  'saved', 'the first guest draft is saved');
select is((select public.save_initial_guest_draft(auth.uid(), 'd0000000-0000-4000-8000-000000000001',
    profile, target, body_log) ->> 'status' from args),
  'already_saved', 'sending the same draft again saves nothing new');
select is((select public.save_initial_guest_draft(auth.uid(), 'd0000000-0000-4000-8000-000000000002',
    profile, target, body_log) ->> 'status' from args),
  'saved_target_exists', 'a second draft does not replace the saved target');
select is((select count(*)::int from public.calorie_targets), 1, 'one target after the first save');
select is((select count(*)::int from public.body_logs), 1, 'one weigh-in after the first save');

-- save_profile_and_target: adds a new target and keeps the old one.
select isnt((select public.save_profile_and_target(profile, target || '{"target_kcal": 2200}', body_log) from args),
  null, 'a new target is saved');
select is((select array_agg(target_kcal order by created_at) from public.calorie_targets),
  array[2400, 2200], 'the old target is kept as history');
select is((select count(*)::int from public.body_logs), 2, 'the changed weight is a new weigh-in');

-- save_meal: creates, then replaces the items of the caller's own meal.
select isnt((select public.save_meal(null, '2026-10-25', 'Lunch', one_item) from args), null, 'a meal is saved');
select is((select count(*)::int from public.meal_items), 1, 'the meal has one item');
select lives_ok($$select public.save_meal((select id from public.meals limit 1), '2026-10-25', 'Lunch',
    one_item || one_item) from args$$, 'the meal is edited');
select is((select count(*)::int from public.meal_items), 2, 'editing replaces the items');
select throws_ok($$select public.save_meal(null, '2026-10-25', 'Lunch',
    (select jsonb_agg(item) from args, jsonb_array_elements(one_item) as item, generate_series(1, 31)))$$,
  '22023', null, 'a meal with 31 foods is refused');

-- save_meal_plan: numbered, unticked plan meals only.
select throws_ok($$select public.save_meal_plan(jsonb_build_array(jsonb_build_object(
    'meal_date', '2026-10-26', 'label', 'Snack', 'items', one_item))) from args$$,
  '22023', null, 'a plan meal must be labelled Meal 1 to Meal 6');
select throws_ok($$select public.save_meal_plan((select jsonb_agg(jsonb_build_object(
    'meal_date', '2026-10-26', 'label', 'Meal 1', 'items', one_item)) from args, generate_series(1, 43)))$$,
  '22023', null, 'a plan with 43 meals is refused');
select is((select cardinality(public.save_meal_plan(jsonb_build_array(
    jsonb_build_object('meal_date', '2026-10-26', 'label', 'Meal 1', 'items', one_item),
    jsonb_build_object('meal_date', '2026-10-26', 'label', 'Meal 2', 'items', one_item)))) from args),
  2, 'a two-meal plan is saved');
select is((select count(*)::int from public.meals where from_plan and not eaten and user_id = auth.uid()),
  2, 'plan meals belong to A, are marked from the plan, and start unticked');

-- save_workout_log: creates, then replaces the sets of the caller's own workout.
select isnt((select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-25', two_sets) from args),
  null, 'a workout is saved');
select is((select count(*)::int from public.workout_log_sets), 2, 'the workout has two sets');
select lives_ok($$select public.save_workout_log((select id from public.workout_logs limit 1),
    'full-body.beginner.gym', 'day-a', '2026-10-25', jsonb_build_array(two_sets -> 0)) from args$$,
  'the workout is edited');
select is((select count(*)::int from public.workout_log_sets), 1, 'editing replaces the sets');
select throws_ok($$select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-25',
    (select jsonb_agg(two_sets -> 0) from args, generate_series(1, 101)))$$,
  '22023', null, 'a workout with 101 sets is refused');

-- User B cannot edit A's meal or workout, and has no profile to save a target to.
-- A's ids are noted first, because B cannot read A's rows.
create temporary table a_ids on commit drop as select
  (select id from public.meals where not from_plan) as meal_id,
  (select id from public.workout_logs) as workout_id;
set local "request.jwt.claims" to '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "authenticated"}';
select throws_ok($$select public.save_meal(meal_id, '2026-10-25', 'Taken', one_item) from a_ids, args$$,
  'P0002', null, 'B cannot edit A''s meal');
select throws_ok($$select public.save_workout_log(workout_id, 'full-body.beginner.gym', 'day-b', '2026-10-25',
    two_sets) from a_ids, args$$,
  'P0002', null, 'B cannot edit A''s workout');
select throws_ok($$select public.save_profile_and_target(profile, target, null) from args$$,
  'P0002', null, 'a target needs a saved profile first');

select * from finish();
rollback;
