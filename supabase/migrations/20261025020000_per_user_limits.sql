-- AU-66: per-user limits in the database (audit F12). A signed-in user can call the API directly
-- with their own token and skip the app's checks. Without limits they could fill the database
-- with their own rows. Real use stays far below every limit. All numbers are placeholders.
--
--   Rows created in the last 24 hours, per user (rows deleted since then do not count):
--     meals 100 (a 7-day plan is 42), body_logs 50, calorie_targets 20, workout_logs 20
--   Rows per parent: meal_items 30 per meal (as save_meal), workout_log_sets 100 per workout (as save_workout_log)
--   Rows per user: user_exercise_swaps 500
--
-- profiles and user_preferences hold one row per user, and user_avoided_foods one per food,
-- so they need no limit.

-- Trigger functions live outside the API's schemas, so they cannot be called as RPCs.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- The 24-hour count needs a time the client cannot choose.
alter table public.body_logs add column created_at timestamptz not null default now();

create or replace function private.stamp_created_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- An update keeps the first time, so an old time cannot be set to empty the 24-hour window.
  if tg_op = 'UPDATE' then
    new.created_at := old.created_at;
    return new;
  end if;

  -- Meals saved together share the transaction time (overview-data.ts relies on it).
  -- Targets use the real time, as save_profile_and_target does, so the newest is always strict.
  if tg_table_name = 'calorie_targets' then
    new.created_at := clock_timestamp();
  else
    new.created_at := now();
  end if;
  return new;
end;
$$;

create trigger stamp_created_at before insert or update on public.meals
  for each row execute function private.stamp_created_at();
create trigger stamp_created_at before insert or update on public.body_logs
  for each row execute function private.stamp_created_at();
create trigger stamp_created_at before insert on public.calorie_targets
  for each row execute function private.stamp_created_at();
create trigger stamp_created_at before insert or update on public.workout_logs
  for each row execute function private.stamp_created_at();

-- One check per insert statement, over the users or parents that the statement touched.
-- It runs with the caller's permissions, so a signed-in user only ever counts their own rows.
create or replace function private.enforce_row_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_over boolean;
begin
  case tg_table_name
    when 'meals' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.meals m
            where m.user_id = u.user_id and m.created_at > now() - interval '24 hours') > 100
      ) into v_over;
    when 'body_logs' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.body_logs b
            where b.user_id = u.user_id and b.created_at > now() - interval '24 hours') > 50
      ) into v_over;
    when 'calorie_targets' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.calorie_targets t
            where t.user_id = u.user_id and t.created_at > now() - interval '24 hours') > 20
      ) into v_over;
    when 'workout_logs' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.workout_logs w
            where w.user_id = u.user_id and w.created_at > now() - interval '24 hours') > 20
      ) into v_over;
    when 'meal_items' then
      select exists (
        select 1 from (select distinct meal_id from new_rows) as p
          where (select count(*) from public.meal_items i where i.meal_id = p.meal_id) > 30
      ) into v_over;
    when 'workout_log_sets' then
      select exists (
        select 1 from (select distinct workout_log_id from new_rows) as p
          where (select count(*) from public.workout_log_sets s where s.workout_log_id = p.workout_log_id) > 100
      ) into v_over;
    when 'user_exercise_swaps' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.user_exercise_swaps x where x.user_id = u.user_id) > 500
      ) into v_over;
  end case;

  if v_over then
    raise exception 'Too many % rows. Please try again later.', tg_table_name
      using errcode = '54000';
  end if;
  return null;
end;
$$;

create trigger enforce_row_limit after insert on public.meals
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.body_logs
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.calorie_targets
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.workout_logs
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.meal_items
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.workout_log_sets
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.user_exercise_swaps
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();

revoke all on function private.stamp_created_at() from public, anon, authenticated;
revoke all on function private.enforce_row_limit() from public, anon, authenticated;

-- The 24-hour count on meals reads by user and creation time.
create index meals_user_created_at_idx on public.meals (user_id, created_at);
