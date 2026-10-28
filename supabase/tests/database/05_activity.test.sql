-- Steps, sleep, other activity, and workout duration (migration 20261028010000_ac1_activity).
-- Owner-only access, the per-day upsert, the row limits, account deletion, and save_workout_log's
-- optional duration. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(46);

-- Setup as the admin: two users, and one day and one activity for B.
insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@rvfit.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'b@rvfit.test');

insert into public.daily_activity (id, user_id, on_date, steps, sleep_minutes)
  values ('b4000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-28', 6000, 420);
insert into public.activity_logs (id, user_id, performed_on, activity_key, minutes)
  values ('b5000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-28', 'cycling', 30);

-- Signed-out visitors are denied.
set local role anon;
select throws_ok($$select 1 from public.daily_activity limit 1$$, '42501', null, 'anon cannot read daily activity');
select throws_ok($$select 1 from public.activity_logs limit 1$$, '42501', null, 'anon cannot read activity logs');
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-27', 1)$$,
  '42501', null, 'anon cannot add daily activity');
select throws_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-27', 'running', 10)$$,
  '42501', null, 'anon cannot add an activity');
select throws_ok($$select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-28', '[]', null, 30)$$,
  '42501', null, 'anon cannot call save_workout_log with a duration');
reset role;

-- Act as user A.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

-- A cannot see, add, change or delete B's rows.
select is((select count(*)::int from public.daily_activity), 0, 'A cannot read B''s daily activity');
select is((select count(*)::int from public.activity_logs), 0, 'A cannot read B''s activity logs');
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-27', 1)$$,
  '42501', null, 'A cannot add a day for B');
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-28', 1)
  on conflict (user_id, on_date) do update set steps = excluded.steps$$,
  '42501', null, 'A cannot upsert into B''s day');
select throws_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '2026-10-28', 'running', 10)$$,
  '42501', null, 'A cannot add an activity for B');
select lives_ok($$
  update public.daily_activity set steps = 1, sleep_minutes = 1;
  delete from public.daily_activity;
  delete from public.activity_logs
$$, 'updates and deletes aimed at B run without error');
select throws_ok($$update public.activity_logs set minutes = 1$$,
  '42501', null, 'activity logs cannot be changed, only added or deleted');

-- The per-day upsert: saving steps keeps sleep, and saving sleep keeps steps.
select lives_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values (auth.uid(), '2026-10-28', 8000)
  on conflict (user_id, on_date) do update set steps = excluded.steps$$,
  'A saves today''s steps');
select lives_ok($$insert into public.daily_activity (user_id, on_date, sleep_minutes)
  values (auth.uid(), '2026-10-28', 450)
  on conflict (user_id, on_date) do update set sleep_minutes = excluded.sleep_minutes$$,
  'A saves last night''s sleep on the same day');
select lives_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values (auth.uid(), '2026-10-28', 9500)
  on conflict (user_id, on_date) do update set steps = excluded.steps$$,
  'A saves today''s steps again');
select is((select count(*)::int from public.daily_activity where on_date = '2026-10-28'), 1,
  'the upsert keeps one row per day');
select is((select steps from public.daily_activity where on_date = '2026-10-28'), 9500,
  'saving steps again replaces the steps');
select is((select sleep_minutes from public.daily_activity where on_date = '2026-10-28'), 450,
  'saving steps keeps the sleep');
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values (auth.uid(), '2026-10-28', 1)$$,
  '23505', null, 'a second plain insert for the same day is refused');

-- A cannot move their own rows to B.
select throws_ok($$update public.daily_activity set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501', null, 'A cannot hand a day to B');

-- The database sets created_at, and an update keeps it.
insert into public.activity_logs (id, user_id, performed_on, activity_key, minutes, created_at)
  values ('a5000000-0000-4000-8000-000000000001', auth.uid(), '2026-10-28', 'other_cardio', 20, '2000-01-01');
select is((select created_at from public.activity_logs where id = 'a5000000-0000-4000-8000-000000000001'), now(),
  'an activity gets the server time, not the time sent');
update public.daily_activity set created_at = '2000-01-01' where on_date = '2026-10-28';
select is((select created_at from public.daily_activity where on_date = '2026-10-28'), now(),
  'an update cannot change a day''s created_at');

-- Value checks (placeholder limits).
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps) values (auth.uid(), '2026-10-01', 100001)$$,
  '23514', null, 'more than 100000 steps is refused');
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps) values (auth.uid(), '2026-10-01', -1)$$,
  '23514', null, 'negative steps are refused');
select throws_ok($$insert into public.daily_activity (user_id, on_date, sleep_minutes) values (auth.uid(), '2026-10-01', 1441)$$,
  '23514', null, 'more than 1440 minutes of sleep is refused');
select throws_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  values (auth.uid(), '2026-10-28', 'running', 0)$$,
  '23514', null, 'an activity of 0 minutes is refused');
select throws_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  values (auth.uid(), '2026-10-28', 'running', 601)$$,
  '23514', null, 'an activity over 600 minutes is refused');
select throws_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  values (auth.uid(), '2026-10-28', 'Running!', 10)$$,
  '23514', null, 'an activity key outside the key pattern is refused');

-- save_workout_log: the duration is optional.
create temporary table args on commit drop as
  select '[{"slot_key": "squat", "exercise_key": "goblet-squat", "set_number": 1, "reps": 10, "weight_kg": 20}]'::jsonb
    as one_set;
create temporary table saved (name text primary key, id uuid) on commit drop;

insert into saved select 'plain', public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-28', one_set)
  from args;
select is((select duration_min from public.workout_logs where id = (select id from saved where name = 'plain')), null,
  'a workout saved without a duration has none');
insert into saved select 'timed', public.save_workout_log(p_log_id => null, p_template_key => 'full-body.beginner.gym',
    p_day_key => 'day-b', p_performed_on => '2026-10-28', p_sets => one_set, p_duration_min => 45)
  from args;
select is((select duration_min from public.workout_logs where id = (select id from saved where name = 'timed')), 45,
  'a workout saved with a duration stores it');
select lives_ok($$select public.save_workout_log((select id from saved where name = 'plain'),
    'full-body.beginner.gym', 'day-a', '2026-10-28', one_set, null, 30) from args$$,
  'an edit can add a duration');
select is((select duration_min from public.workout_logs where id = (select id from saved where name = 'plain')), 30,
  'the edit stores the duration');
select lives_ok($$select public.save_workout_log((select id from saved where name = 'timed'),
    'full-body.beginner.gym', 'day-b', '2026-10-28', one_set) from args$$,
  'an edit can leave the duration out');
select is((select duration_min from public.workout_logs where id = (select id from saved where name = 'timed')), null,
  'an edit without a duration clears it');
select is(
  (select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-28', one_set,
    'c0000000-0000-4000-8000-000000000001', 20) from args),
  (select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-28', one_set,
    'c0000000-0000-4000-8000-000000000001', 25) from args),
  'a retried save with a duration returns the same workout');
select is((select duration_min from public.workout_logs where save_key = 'c0000000-0000-4000-8000-000000000001'), 25,
  'the retry''s duration replaces the first send''s');
select throws_ok($$select public.save_workout_log(null, 'full-body.beginner.gym', 'day-a', '2026-10-28', one_set,
    null, 601) from args$$,
  '23514', null, 'a workout over 600 minutes is refused');

-- Limits: 50 new rows in 24 hours for each table (placeholders). A has one day so far.
select lives_ok($$insert into public.daily_activity (user_id, on_date, steps)
  select auth.uid(), date '2026-01-01' + n, 1000 from generate_series(1, 49) as n$$,
  'A can add 50 days in 24 hours');
select throws_ok($$insert into public.daily_activity (user_id, on_date, steps) values (auth.uid(), '2025-01-01', 1000)$$,
  '54000', null, 'the 51st new day in 24 hours is refused');
select lives_ok($$insert into public.daily_activity (user_id, on_date, steps)
  values (auth.uid(), '2026-10-28', 10000)
  on conflict (user_id, on_date) do update set steps = excluded.steps$$,
  'changing an existing day is not a new row');
-- A has one activity so far.
select lives_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  select auth.uid(), '2026-10-28', 'running', 10 from generate_series(1, 49)$$,
  'A can add 50 activities in 24 hours');
select throws_ok($$insert into public.activity_logs (user_id, performed_on, activity_key, minutes)
  values (auth.uid(), '2026-10-28', 'running', 10)$$,
  '54000', null, 'the 51st activity in 24 hours is refused');

-- Back to the admin: B's rows are unchanged, and deleting B removes them.
reset role;
reset "request.jwt.claims";

select is((select steps from public.daily_activity where id = 'b4000000-0000-4000-8000-000000000001'), 6000,
  'B''s day is unchanged');
select is((select minutes from public.activity_logs where id = 'b5000000-0000-4000-8000-000000000001'), 30,
  'B''s activity is unchanged');

delete from auth.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select is(
  (select count(*)::int from public.daily_activity where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')
    + (select count(*)::int from public.activity_logs where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0, 'deleting a user removes their days and activities');
select is((select count(*)::int from public.daily_activity where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 50,
  'another user''s days are kept');

select * from finish();
rollback;
