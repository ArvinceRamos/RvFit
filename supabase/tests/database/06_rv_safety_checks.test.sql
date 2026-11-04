-- RV-5 and RV-6 safety nets (migration 20261104010000_rv_safety_checks): the calorie floor, the protein cap,
-- and no future workout dates. Everything is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'a@rvfit.test');
insert into public.profiles (user_id, preferred_units, adult_confirmed_at)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'metric', now());

-- Run as the signed-in user, as the mobile app does.
set local role authenticated;
set local "request.jwt.claims" to '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "role": "authenticated"}';

select lives_ok($$insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', gen_random_uuid(), 'manual', 1200, 105, 120, 40, 17, 'test')$$,
  'a target at the 1,200 kcal floor with protein at the 35% cap saves');
select throws_ok($$insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', gen_random_uuid(), 'manual', 1199, 60, 150, 40, 17, 'test')$$,
  '23514', null, 'a target under the floor is refused');
select throws_ok($$insert into public.calorie_targets (user_id, guest_draft_id, source, target_kcal,
    protein_g, carbs_g, fat_g, fiber_g, config_version)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', gen_random_uuid(), 'manual', 2000, 176, 150, 60, 28, 'test')$$,
  '23514', null, 'protein over 35% of calories is refused');
select throws_ok($$select public.save_profile_and_target(
    '{"preferred_units": "metric"}',
    '{"source": "manual", "target_kcal": 900, "protein_g": 50, "carbs_g": 100, "fat_g": 30, "fiber_g": 13, "config_version": "test"}',
    null)$$,
  '23514', null, 'save_profile_and_target cannot save a target under the floor');
select is((select count(*)::int from public.calorie_targets), 1, 'only the valid target was saved');

-- Workout dates: today and tomorrow (time-zone slack) save; later dates do not.
select lives_ok(format($$insert into public.workout_logs (user_id, template_key, day_key, performed_on)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'full-body-ab.beginner.gym', 'a', %L)$$, current_date),
  'a workout dated today saves');
select lives_ok(format($$insert into public.workout_logs (user_id, template_key, day_key, performed_on)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'full-body-ab.beginner.gym', 'b', %L)$$, current_date + 1),
  'a workout dated tomorrow saves (time-zone slack)');
select throws_ok(format($$insert into public.workout_logs (user_id, template_key, day_key, performed_on)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'full-body-ab.beginner.gym', 'a', %L)$$, current_date + 2),
  '23514', 'Workout date cannot be in the future.', 'a workout two days ahead is refused');
select throws_ok(format($$update public.workout_logs set performed_on = %L where day_key = 'a'$$, current_date + 5),
  '23514', 'Workout date cannot be in the future.', 'moving a workout into the future is refused');

select * from finish();
rollback;
