-- Per-user limits (migration 20261025020000_per_user_limits). Each limit is reached exactly, then
-- one more row is refused. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(29);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@rvfit.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@rvfit.test');

insert into public.foods (id, fdc_id, source_type, name, role, preparation_state,
    kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g)
  values ('f0000000-0000-4000-8000-000000000001', 990000001, 'foundation', 'Test rice', 'carb', 'cooked',
    130, 2.7, 28, 0.3);

-- The trigger functions are not part of the API.
select schema_privs_are('private', 'authenticated', array[]::text[], 'authenticated has no access to the private schema');
select schema_privs_are('private', 'anon', array[]::text[], 'anon has no access to the private schema');
select function_privs_are('private', 'enforce_row_limit', array[]::text[], 'authenticated', array[]::text[]);
select function_privs_are('private', 'stamp_created_at', array[]::text[], 'authenticated', array[]::text[]);

set local role authenticated;
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- The database sets created_at, and an update keeps it.
insert into public.meals (id, user_id, meal_date, label, created_at)
  values ('a2000000-0000-4000-8000-000000000001', auth.uid(), '2026-10-25', 'Lunch', '2000-01-01');
select is((select created_at from public.meals where id = 'a2000000-0000-4000-8000-000000000001'), now(),
  'a meal gets the server time, not the time sent');
update public.meals set created_at = '2000-01-01' where id = 'a2000000-0000-4000-8000-000000000001';
select is((select created_at from public.meals where id = 'a2000000-0000-4000-8000-000000000001'), now(),
  'an update cannot change a meal''s created_at');
insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal, protein_g, carbs_g, fat_g, fiber_g,
    config_version, created_at)
  values (auth.uid(), gen_random_uuid(), 'manual', 2000, 120, 220, 70, 28, 'test', '2999-01-01');
select ok((select max(created_at) from public.calorie_targets) <= clock_timestamp(),
  'a target cannot be dated in the future');
insert into public.body_logs (user_id, weight_kg, created_at) values (auth.uid(), 70, '2000-01-01');
select is((select created_at from public.body_logs), now(), 'a weigh-in gets the server time');

-- meals: 100 in 24 hours. One exists already.
select lives_ok($$insert into public.meals (user_id, meal_date, label)
  select auth.uid(), '2026-10-25', 'Snack ' || n from generate_series(1, 99) as n$$,
  'A can save 100 meals in 24 hours');
select throws_ok($$insert into public.meals (user_id, meal_date, label) values (auth.uid(), '2026-10-26', 'One more')$$,
  '54000', null, 'the 101st meal in 24 hours is refused');
select throws_ok($$select public.save_meal(null, '2026-10-26', 'One more',
    '[{"food_id": "f0000000-0000-4000-8000-000000000001", "grams": 100}]')$$,
  '54000', null, 'save_meal hits the same limit');
select lives_ok($$delete from public.meals where label in ('Snack 1', 'Snack 2')$$, 'A deletes two meals');
select lives_ok($$insert into public.meals (user_id, meal_date, label)
  select auth.uid(), '2026-10-26', 'Again ' || n from generate_series(1, 2) as n$$,
  'deleted meals do not count');

-- body_logs: 50 in 24 hours. One exists already.
select lives_ok($$insert into public.body_logs (user_id, weight_kg) select auth.uid(), 70 from generate_series(1, 49)$$,
  'A can save 50 weigh-ins in 24 hours');
select throws_ok($$insert into public.body_logs (user_id, weight_kg) values (auth.uid(), 70)$$,
  '54000', null, 'the 51st weigh-in in 24 hours is refused');

-- calorie_targets: 20 in 24 hours. One exists already.
select lives_ok($$insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version)
  select auth.uid(), gen_random_uuid(), 'manual', 2000, 120, 220, 70, 28, 'test' from generate_series(1, 19)$$,
  'A can save 20 targets in 24 hours');
select throws_ok($$insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version)
  values (auth.uid(), gen_random_uuid(), 'manual', 2000, 120, 220, 70, 28, 'test')$$,
  '54000', null, 'the 21st target in 24 hours is refused');

-- workout_logs: 20 in 24 hours.
select lives_ok($$insert into public.workout_logs (id, user_id, template_key, day_key, performed_on)
  select case when n = 1 then 'a3000000-0000-4000-8000-000000000001'::uuid else gen_random_uuid() end,
    auth.uid(), 'full-body.beginner.gym', 'day-a', '2026-10-25' from generate_series(1, 20) as n$$,
  'A can save 20 workouts in 24 hours');
select throws_ok($$insert into public.workout_logs (user_id, template_key, day_key, performed_on)
  values (auth.uid(), 'full-body.beginner.gym', 'day-a', '2026-10-25')$$,
  '54000', null, 'the 21st workout in 24 hours is refused');

-- meal_items: 30 per meal.
select lives_ok($$insert into public.meal_items (meal_id, food_id, grams)
  select 'a2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 10
    from generate_series(1, 30)$$,
  'a meal can hold 30 foods');
select throws_ok($$insert into public.meal_items (meal_id, food_id, grams)
  values ('a2000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000001', 10)$$,
  '54000', null, 'a 31st food in one meal is refused');

-- workout_log_sets: 100 per workout (10 slots of 10 sets).
select lives_ok($$insert into public.workout_log_sets (workout_log_id, slot_key, exercise_key, set_number, reps)
  select 'a3000000-0000-4000-8000-000000000001', 'slot-' || s, 'push-up', n, 10
    from generate_series(1, 10) as s, generate_series(1, 10) as n$$,
  'a workout can hold 100 sets');
select throws_ok($$insert into public.workout_log_sets (workout_log_id, slot_key, exercise_key, set_number, reps)
  values ('a3000000-0000-4000-8000-000000000001', 'slot-11', 'push-up', 1, 10)$$,
  '54000', null, 'a 101st set in one workout is refused');

-- user_exercise_swaps: 500 per user; changing an existing swap is still allowed.
select lives_ok($$insert into public.user_exercise_swaps (user_id, template_key, slot_key, exercise_key)
  select auth.uid(), 'full-body.beginner.gym', 'slot-' || n, 'push-up' from generate_series(1, 500) as n$$,
  'A can keep 500 swaps');
select throws_ok($$insert into public.user_exercise_swaps (user_id, template_key, slot_key, exercise_key)
  values (auth.uid(), 'full-body.beginner.gym', 'slot-501', 'push-up')$$,
  '54000', null, 'a 501st swap is refused');
select lives_ok($$insert into public.user_exercise_swaps (user_id, template_key, slot_key, exercise_key)
  values (auth.uid(), 'full-body.beginner.gym', 'slot-1', 'knee-push-up')
  on conflict (user_id, template_key, slot_key) do update set exercise_key = excluded.exercise_key$$,
  'changing a saved swap is not a new row');

-- Another user is not affected by A's rows.
set local "request.jwt.claims" to '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "role": "authenticated"}';
select lives_ok($$insert into public.meals (user_id, meal_date, label) values (auth.uid(), '2026-10-25', 'Lunch')$$,
  'B can save a meal while A is at the limit');
select lives_ok($$insert into public.body_logs (user_id, weight_kg) values (auth.uid(), 60)$$,
  'B can save a weigh-in while A is at the limit');

-- Rows older than 24 hours do not count. Only the admin can age rows, with the stamp trigger off.
reset role;
alter table public.meals disable trigger stamp_created_at;
update public.meals set created_at = now() - interval '25 hours'
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
alter table public.meals enable trigger stamp_created_at;
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';
select lives_ok($$insert into public.meals (user_id, meal_date, label)
  select auth.uid(), '2026-10-27', 'Next day ' || n from generate_series(1, 100) as n$$,
  'meals older than 24 hours do not count');

select * from finish();
rollback;
