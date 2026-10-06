-- Phase 4: save edited profile details and a new calorie target in one transaction.
-- Runs as the caller, so row-level security still applies. It only ever touches the caller's rows.
-- The newest calorie_targets row by created_at is the current target. Old rows stay as history.
create or replace function public.save_profile_and_target(
  p_profile jsonb,
  p_target jsonb,
  p_body_log jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_target_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to save a target.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_profile) is distinct from 'object'
    or jsonb_typeof(p_target) is distinct from 'object'
    or (p_body_log is not null and jsonb_typeof(p_body_log) is distinct from 'object')
  then
    raise exception 'Profile and target are required.'
      using errcode = '22023';
  end if;

  -- Details are only replaced when they are sent (a calculated target). A manual target keeps them.
  update public.profiles
    set preferred_units = p_profile ->> 'preferred_units',
        age_years = case when p_profile ? 'age_years' then (p_profile ->> 'age_years')::integer else age_years end,
        sex_formula_branch = case when p_profile ? 'sex_formula_branch' then p_profile ->> 'sex_formula_branch' else sex_formula_branch end,
        height_cm = case when p_profile ? 'height_cm' then (p_profile ->> 'height_cm')::numeric else height_cm end,
        activity_level = case when p_profile ? 'activity_level' then p_profile ->> 'activity_level' else activity_level end,
        updated_at = now()
    where user_id = v_user_id;

  -- The profile is created by the first saved target, which also records the age confirmation.
  if not found then
    raise exception 'Profile not found.'
      using errcode = 'P0002';
  end if;

  insert into public.calorie_targets (
    user_id,
    guest_draft_id,
    source,
    target_kcal,
    goal,
    pace,
    protein_g,
    carbs_g,
    fat_g,
    fiber_g,
    formula_branch,
    floor_applied,
    config_version,
    calculation_inputs,
    created_at
  )
  values (
    v_user_id,
    gen_random_uuid(),
    p_target ->> 'source',
    (p_target ->> 'target_kcal')::integer,
    nullif(p_target ->> 'goal', ''),
    nullif(p_target ->> 'pace', ''),
    (p_target ->> 'protein_g')::integer,
    (p_target ->> 'carbs_g')::integer,
    (p_target ->> 'fat_g')::integer,
    (p_target ->> 'fiber_g')::integer,
    nullif(p_target ->> 'formula_branch', ''),
    coalesce((p_target ->> 'floor_applied')::boolean, false),
    p_target ->> 'config_version',
    coalesce(p_target -> 'calculation_inputs', '{}'::jsonb),
    -- The real time, not the transaction start, so "newest by created_at" is always strict.
    clock_timestamp()
  )
  returning id into v_target_id;

  -- A changed current weight is saved as a new weigh-in in the same transaction.
  if p_body_log is not null then
    insert into public.body_logs (user_id, logged_at, weight_kg)
    values (v_user_id, now(), (p_body_log ->> 'weight_kg')::numeric);
  end if;

  return v_target_id;
end;
$$;

revoke all on function public.save_profile_and_target(jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_profile_and_target(jsonb, jsonb, jsonb)
  to authenticated;
