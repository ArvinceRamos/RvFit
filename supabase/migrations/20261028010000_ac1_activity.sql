-- AC-1: steps, sleep, other activity, and workout duration (docs/ACTIVITY.md, "Data and database").
-- Dates are the browser's local date, sent by the client, as for meals and workouts.
-- Activity keys are checked against the content list in the app; the database checks the pattern.
-- Numeric limits are placeholders. Keep them in step with calculationConfig.activity.

-- One row per user per day. Steps and sleep save with an upsert on (user_id, on_date),
-- so saving one keeps the other. Sleep is saved on the day the user woke up.
create table public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  on_date date not null,
  -- Placeholder: at most 100000 steps in one day.
  steps integer
    constraint daily_activity_steps_placeholder_check check (steps between 0 and 100000),
  -- A day has 1440 minutes.
  sleep_minutes integer
    constraint daily_activity_sleep_minutes_check check (sleep_minutes between 0 and 1440),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_activity_user_on_date_key unique (user_id, on_date)
);

-- Other activity (cycling, running, ...). Walking is not here, because steps count it.
create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  performed_on date not null,
  activity_key text not null
    check (char_length(activity_key) <= 100 and activity_key ~ '^[a-z0-9]+(_[a-z0-9]+)*$'),
  -- Placeholder: at most 600 minutes in one entry.
  minutes integer not null
    constraint activity_logs_minutes_placeholder_check check (minutes between 1 and 600),
  created_at timestamptz not null default now()
);

-- Placeholder: at most 600 minutes per workout. Null means no duration was given;
-- the estimate then uses the number of sets.
alter table public.workout_logs add column duration_min integer
  constraint workout_logs_duration_min_placeholder_check check (duration_min between 1 and 600);

create index activity_logs_user_performed_on_idx
  on public.activity_logs (user_id, performed_on desc, created_at desc);

alter table public.daily_activity enable row level security;
alter table public.activity_logs enable row level security;

create policy "Users can read their own daily activity"
  on public.daily_activity
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own daily activity"
  on public.daily_activity
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own daily activity"
  on public.daily_activity
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own daily activity"
  on public.daily_activity
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- No update policy: an entry is added or deleted, never changed.
create policy "Users can read their own activity logs"
  on public.activity_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own activity logs"
  on public.activity_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own activity logs"
  on public.activity_logs
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Only the grants the app needs; no truncate, references or trigger (as in 20261025010000).
revoke all on public.daily_activity, public.activity_logs from public, anon, authenticated;

grant select, insert, update, delete on public.daily_activity to authenticated;
grant select, insert, delete on public.activity_logs to authenticated;

-- The database sets created_at, as in 20261025020000_per_user_limits.
create trigger stamp_created_at before insert or update on public.daily_activity
  for each row execute function private.stamp_created_at();
create trigger stamp_created_at before insert on public.activity_logs
  for each row execute function private.stamp_created_at();

-- Per-user limits, with two new cases. The other cases are unchanged from 20261025020000.
--   Rows created in the last 24 hours, per user (placeholders):
--     daily_activity 50 (one row per day is the normal use), activity_logs 50
-- An upsert that changes an existing day is an update, so it does not count as a new row.
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
    -- Placeholder: 50 daily_activity rows created in 24 hours.
    when 'daily_activity' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.daily_activity d
            where d.user_id = u.user_id and d.created_at > now() - interval '24 hours') > 50
      ) into v_over;
    -- Placeholder: 50 activity_logs rows created in 24 hours.
    when 'activity_logs' then
      select exists (
        select 1 from (select distinct user_id from new_rows) as u
          where (select count(*) from public.activity_logs a
            where a.user_id = u.user_id and a.created_at > now() - interval '24 hours') > 50
      ) into v_over;
  end case;

  if v_over then
    raise exception 'Too many % rows. Please try again later.', tg_table_name
      using errcode = '54000';
  end if;
  return null;
end;
$$;

revoke all on function private.enforce_row_limit() from public, anon, authenticated;

create trigger enforce_row_limit after insert on public.daily_activity
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();
create trigger enforce_row_limit after insert on public.activity_logs
  referencing new table as new_rows for each statement execute function private.enforce_row_limit();

-- save_workout_log gets an optional duration as its last parameter, so old callers still work.
-- Everything else is unchanged from 20261025030000_workout_save_key.
-- Saving an edit sets the duration to the value sent; null clears it.
drop function public.save_workout_log(uuid, text, text, date, jsonb, uuid);

create function public.save_workout_log(
  p_log_id uuid,
  p_template_key text,
  p_day_key text,
  p_performed_on date,
  p_sets jsonb,
  p_save_key uuid default null,
  p_duration_min integer default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_log_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to save a workout.'
      using errcode = '42501';
  end if;

  -- Placeholder upper bound on sets per workout (7 slots x 10 sets, rounded up).
  if p_template_key is null
    or p_day_key is null
    or p_performed_on is null
    or jsonb_typeof(p_sets) is distinct from 'array'
    or jsonb_array_length(p_sets) = 0
    or jsonb_array_length(p_sets) > 100
  then
    raise exception 'Workout template, day, date, and 1 to 100 sets are required.'
      using errcode = '22023';
  end if;

  if p_log_id is null and p_save_key is not null then
    -- Two copies of the same save wait for each other, so the second finds the first.
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('save_workout_log:' || p_save_key::text, 0)
    );
    select id
      into v_log_id
      from public.workout_logs
      where user_id = v_user_id
        and save_key = p_save_key;
  else
    v_log_id := p_log_id;
  end if;

  if v_log_id is null then
    insert into public.workout_logs (user_id, template_key, day_key, performed_on, save_key, duration_min)
    values (v_user_id, p_template_key, p_day_key, p_performed_on, p_save_key, p_duration_min)
    returning id into v_log_id;
  else
    update public.workout_logs
      set template_key = p_template_key,
          day_key = p_day_key,
          performed_on = p_performed_on,
          duration_min = p_duration_min,
          updated_at = now()
      where id = v_log_id
        and user_id = v_user_id
      returning id into v_log_id;

    if v_log_id is null then
      raise exception 'Workout not found.'
        using errcode = 'P0002';
    end if;

    delete from public.workout_log_sets
      where workout_log_id = v_log_id;
  end if;

  insert into public.workout_log_sets
    (workout_log_id, slot_key, exercise_key, set_number, reps, seconds, weight_kg)
  select
    v_log_id,
    item ->> 'slot_key',
    item ->> 'exercise_key',
    (item ->> 'set_number')::integer,
    (item ->> 'reps')::integer,
    (item ->> 'seconds')::integer,
    (item ->> 'weight_kg')::numeric
  from jsonb_array_elements(p_sets) as item;

  return v_log_id;
end;
$$;

revoke all on function public.save_workout_log(uuid, text, text, date, jsonb, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.save_workout_log(uuid, text, text, date, jsonb, uuid, integer)
  to authenticated;
