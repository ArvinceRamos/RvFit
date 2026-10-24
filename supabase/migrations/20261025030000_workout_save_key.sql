-- AU-68: a new workout can be saved again safely. On a weak gym signal the save can reach the
-- database while the reply is lost; pressing Save again then made a second workout. The form now
-- sends one save key per new workout, and a second save with the same key updates that workout.

alter table public.workout_logs add column save_key uuid;

create unique index workout_logs_user_save_key on public.workout_logs (user_id, save_key)
  where save_key is not null;

drop function public.save_workout_log(uuid, text, text, date, jsonb);

create function public.save_workout_log(
  p_log_id uuid,
  p_template_key text,
  p_day_key text,
  p_performed_on date,
  p_sets jsonb,
  p_save_key uuid default null
)
returns uuid
language plpgsql
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
    insert into public.workout_logs (user_id, template_key, day_key, performed_on, save_key)
    values (v_user_id, p_template_key, p_day_key, p_performed_on, p_save_key)
    returning id into v_log_id;
  else
    update public.workout_logs
      set template_key = p_template_key,
          day_key = p_day_key,
          performed_on = p_performed_on,
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

revoke all on function public.save_workout_log(uuid, text, text, date, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.save_workout_log(uuid, text, text, date, jsonb, uuid)
  to authenticated;
