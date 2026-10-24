-- Grants and row-level security on every public table and save function.
-- Run with `npx supabase test db --local`. Everything runs in one transaction and is rolled back.
begin;
create extension if not exists pgtap with schema extensions;

select plan(37);

-- A new table or function must be added to these tests on purpose.
select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  12,
  'public has the 12 known tables'
);

select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'every public table has row-level security on'
);

select is(
  (select array_agg(distinct table_name::text) from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon'),
  null,
  'anon holds no grant on any public table'
);

select is(
  (select array_agg(distinct table_name || ':' || privilege_type) from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'authenticated'
      and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')),
  null,
  'authenticated holds no truncate, trigger or references grant'
);

-- Exact grants for signed-in users.
select table_privs_are('public', 'profiles', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'calorie_targets', 'authenticated', array['SELECT', 'INSERT'],
  'calorie_targets is append-only for authenticated');
select table_privs_are('public', 'body_logs', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'foods', 'authenticated', array['SELECT'],
  'the food catalog is read-only for authenticated');
select table_privs_are('public', 'food_measures', 'authenticated', array['SELECT'],
  'food measures are read-only for authenticated');
select table_privs_are('public', 'user_preferences', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'user_avoided_foods', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'meals', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'meal_items', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'workout_logs', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'workout_log_sets', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
select table_privs_are('public', 'user_exercise_swaps', 'authenticated', array['SELECT', 'INSERT', 'UPDATE', 'DELETE']);

-- Policies are only for signed-in users.
select is(
  (select array_agg(tablename || ': ' || policyname) from pg_policies
    where schemaname = 'public' and roles <> array['authenticated']::name[]),
  null,
  'every public policy is for authenticated only'
);

-- Save functions: run with the caller's permissions, a fixed search path, and only for signed-in users.
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  array['save_initial_guest_draft', 'save_meal', 'save_meal_plan', 'save_profile_and_target', 'save_workout_log'],
  'public has the 5 known save functions'
);

select is(
  (select array_agg(p.proname::text) from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (p.prosecdef or p.proconfig is distinct from array['search_path=""'])),
  null,
  'every save function is security invoker with an empty search path'
);

select function_privs_are('public', 'save_initial_guest_draft', array['uuid', 'uuid', 'jsonb', 'jsonb', 'jsonb'],
  'authenticated', array['EXECUTE']);
select function_privs_are('public', 'save_meal', array['uuid', 'date', 'text', 'jsonb'],
  'authenticated', array['EXECUTE']);
select function_privs_are('public', 'save_meal_plan', array['jsonb'],
  'authenticated', array['EXECUTE']);
select function_privs_are('public', 'save_profile_and_target', array['jsonb', 'jsonb', 'jsonb'],
  'authenticated', array['EXECUTE']);
select function_privs_are('public', 'save_workout_log', array['uuid', 'text', 'text', 'date', 'jsonb'],
  'authenticated', array['EXECUTE']);

select function_privs_are('public', 'save_initial_guest_draft', array['uuid', 'uuid', 'jsonb', 'jsonb', 'jsonb'],
  'anon', array[]::text[]);
select function_privs_are('public', 'save_meal', array['uuid', 'date', 'text', 'jsonb'],
  'anon', array[]::text[]);
select function_privs_are('public', 'save_meal_plan', array['jsonb'],
  'anon', array[]::text[]);
select function_privs_are('public', 'save_profile_and_target', array['jsonb', 'jsonb', 'jsonb'],
  'anon', array[]::text[]);
select function_privs_are('public', 'save_workout_log', array['uuid', 'text', 'text', 'date', 'jsonb'],
  'anon', array[]::text[]);

-- Deleting an account removes every row that belongs to it.
select is(
  (select array_agg(c.conrelid::regclass::text order by c.conrelid::regclass::text) from pg_constraint c
    where c.contype = 'f' and c.confrelid = 'auth.users'::regclass
      and c.connamespace = 'public'::regnamespace and c.confdeltype = 'c'),
  array['body_logs', 'calorie_targets', 'meals', 'profiles', 'user_avoided_foods',
    'user_exercise_swaps', 'user_preferences', 'workout_logs'],
  'every table with a user_id cascades when the user is deleted'
);

select is(
  (select array_agg(c.conrelid::regclass::text order by c.conrelid::regclass::text) from pg_constraint c
    where c.contype = 'f' and c.confrelid in ('public.meals'::regclass, 'public.workout_logs'::regclass)
      and c.confdeltype = 'c'),
  array['meal_items', 'workout_log_sets'],
  'meal items and workout sets cascade with their parent'
);

-- No signed-in user or guest may write to the catalog, even with a crafted request.
set local role authenticated;
select throws_ok($$insert into public.foods (fdc_id, source_type, name, role, preparation_state,
    kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g)
  values (990000099, 'foundation', 'Fake', 'other', 'raw', 1, 1, 1, 1)$$,
  '42501', null, 'authenticated cannot add foods');
select throws_ok($$update public.foods set name = 'Changed'$$, '42501', null, 'authenticated cannot change foods');
select throws_ok($$delete from public.food_measures$$, '42501', null, 'authenticated cannot delete food measures');
select throws_ok($$truncate public.body_logs$$, '42501', null, 'authenticated cannot truncate body logs');
reset role;

set local role anon;
select throws_ok($$select 1 from public.foods limit 1$$, '42501', null, 'anon cannot read foods');
select throws_ok($$select 1 from public.profiles limit 1$$, '42501', null, 'anon cannot read profiles');
reset role;

select * from finish();
rollback;
