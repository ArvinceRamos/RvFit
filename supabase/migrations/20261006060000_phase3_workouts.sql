-- Phase 3: workout logs, logged sets, and saved exercise swaps.
-- Workout content (templates, days, slots, exercises) lives in src/lib/workouts, not in the database.
-- Rows store content keys as text; the app checks keys against the content files.
-- Numeric limits are placeholders. Keep them in step with calculationConfig.workouts.

create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_key text not null
    check (template_key ~ '^[a-z0-9]+(-[a-z0-9]+)*\.(beginner|intermediate)\.(bodyweight|dumbbell_only|gym)$'),
  day_key text not null
    check (char_length(day_key) <= 100 and day_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  performed_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workout_log_sets (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  slot_key text not null
    check (char_length(slot_key) <= 100 and slot_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  exercise_key text not null
    check (char_length(exercise_key) <= 100 and exercise_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Placeholder: at most 10 sets per exercise slot in one log.
  set_number integer not null
    constraint workout_log_sets_set_number_placeholder_check check (set_number between 1 and 10),
  -- Placeholder: at most 100 reps per set.
  reps integer
    constraint workout_log_sets_reps_placeholder_check check (reps between 1 and 100),
  -- Placeholder: at most 600 seconds per set.
  seconds integer
    constraint workout_log_sets_seconds_placeholder_check check (seconds between 1 and 600),
  -- Placeholder: at most 500 kg per set. Null for unloaded exercises.
  weight_kg numeric(6, 2)
    constraint workout_log_sets_weight_placeholder_check check (weight_kg > 0 and weight_kg <= 500),
  constraint workout_log_sets_reps_or_seconds_check check (num_nonnulls(reps, seconds) = 1),
  constraint workout_log_sets_log_slot_set_key unique (workout_log_id, slot_key, set_number)
);

create table public.user_exercise_swaps (
  user_id uuid not null references auth.users (id) on delete cascade,
  template_key text not null
    check (template_key ~ '^[a-z0-9]+(-[a-z0-9]+)*\.(beginner|intermediate)\.(bodyweight|dumbbell_only|gym)$'),
  slot_key text not null
    check (char_length(slot_key) <= 100 and slot_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  exercise_key text not null
    check (char_length(exercise_key) <= 100 and exercise_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  updated_at timestamptz not null default now(),
  primary key (user_id, template_key, slot_key)
);

create index workout_logs_user_performed_on_idx
  on public.workout_logs (user_id, performed_on desc, created_at desc);

create index workout_log_sets_workout_log_id_idx
  on public.workout_log_sets (workout_log_id);

alter table public.workout_logs enable row level security;
alter table public.workout_log_sets enable row level security;
alter table public.user_exercise_swaps enable row level security;

-- No delete policy: Phase 3 has no workout delete. Account deletion still cascades.
create policy "Users can read their own workout logs"
  on public.workout_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own workout logs"
  on public.workout_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own workout logs"
  on public.workout_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage sets in their own workout logs"
  on public.workout_log_sets
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.workout_logs
      where workout_logs.id = workout_log_sets.workout_log_id
        and workout_logs.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_logs
      where workout_logs.id = workout_log_sets.workout_log_id
        and workout_logs.user_id = (select auth.uid())
    )
  );

create policy "Users can manage their own exercise swaps"
  on public.user_exercise_swaps
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.workout_logs, public.workout_log_sets, public.user_exercise_swaps
  from public, anon, authenticated;

grant select, insert, update on public.workout_logs to authenticated;
grant select, insert, update, delete
  on public.workout_log_sets, public.user_exercise_swaps
  to authenticated;

-- Saves a workout and all of its sets in one transaction, for a new workout or an edit.
-- Runs as the caller, so row-level security still decides which workouts can be touched.
create or replace function public.save_workout_log(
  p_log_id uuid,
  p_template_key text,
  p_day_key text,
  p_performed_on date,
  p_sets jsonb
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

  if p_log_id is null then
    insert into public.workout_logs (user_id, template_key, day_key, performed_on)
    values (v_user_id, p_template_key, p_day_key, p_performed_on)
    returning id into v_log_id;
  else
    update public.workout_logs
      set template_key = p_template_key,
          day_key = p_day_key,
          performed_on = p_performed_on,
          updated_at = now()
      where id = p_log_id
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

revoke all on function public.save_workout_log(uuid, text, text, date, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_workout_log(uuid, text, text, date, jsonb)
  to authenticated;
