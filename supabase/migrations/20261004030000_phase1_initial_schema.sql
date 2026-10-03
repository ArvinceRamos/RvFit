create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age_years integer,
  sex_formula_branch text check (sex_formula_branch in ('male', 'female')),
  height_cm numeric(6, 2),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'very_active', 'extra_active')
  ),
  preferred_units text not null check (preferred_units in ('metric', 'imperial')),
  adult_confirmed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calorie_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guest_draft_id uuid not null,
  source text not null check (source in ('calculated', 'manual')),
  target_kcal integer not null check (target_kcal between 800 and 6000),
  goal text check (goal in ('lose', 'maintain', 'gain')),
  pace text check (pace in ('gradual', 'steady')),
  protein_g integer not null check (protein_g >= 0),
  carbs_g integer not null check (carbs_g >= 0),
  fat_g integer not null check (fat_g >= 0),
  fiber_g integer not null check (fiber_g >= 0),
  formula_branch text check (formula_branch in ('male', 'female')),
  floor_applied boolean not null default false,
  config_version text not null,
  calculation_inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint calorie_targets_user_guest_draft_key unique (user_id, guest_draft_id),
  constraint calorie_targets_source_fields_check check (
    (
      source = 'manual'
      and goal is null
      and pace is null
      and formula_branch is null
      and floor_applied = false
    )
    or
    (
      source = 'calculated'
      and goal is not null
      and formula_branch is not null
      and (
        (goal = 'maintain' and pace is null)
        or (
          goal in ('lose', 'gain')
          and pace is not null
          and pace in ('gradual', 'steady')
        )
      )
    )
  )
);

create table public.body_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_at timestamptz not null default now(),
  weight_kg numeric(6, 2),
  waist_cm numeric(6, 2),
  chest_cm numeric(6, 2),
  hips_cm numeric(6, 2)
);

create index calorie_targets_user_created_at_idx
  on public.calorie_targets (user_id, created_at desc);

create index body_logs_user_logged_at_idx
  on public.body_logs (user_id, logged_at desc);

alter table public.profiles enable row level security;
alter table public.calorie_targets enable row level security;
alter table public.body_logs enable row level security;

create policy "Users can manage their own profile"
  on public.profiles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own calorie targets"
  on public.calorie_targets
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can manage their own body logs"
  on public.body_logs
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.calorie_targets to authenticated;
grant select, insert, update, delete on public.body_logs to authenticated;

create or replace function public.save_initial_guest_draft(
  p_user_id uuid,
  p_guest_draft_id uuid,
  p_profile jsonb,
  p_target jsonb,
  p_initial_body_log jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_target_id uuid;
begin
  if auth.uid() is null or auth.uid() is distinct from p_user_id then
    raise exception 'Caller is not authorized for the supplied user ID.'
      using errcode = '42501';
  end if;

  if p_guest_draft_id is null
    or jsonb_typeof(p_profile) is distinct from 'object'
    or jsonb_typeof(p_target) is distinct from 'object'
    or jsonb_typeof(p_initial_body_log) is distinct from 'object'
  then
    raise exception 'Draft key, profile, target, and initial body log are required.'
      using errcode = '22023';
  end if;

  -- Serialize first saves for this user, including attempts with different draft keys.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text, 0)
  );

  select id
    into v_target_id
    from public.calorie_targets
    where user_id = p_user_id
      and guest_draft_id = p_guest_draft_id;

  if found then
    return pg_catalog.jsonb_build_object(
      'status', 'already_saved',
      'target_id', v_target_id
    );
  end if;

  if exists (
    select 1
      from public.calorie_targets
      where user_id = p_user_id
  ) then
    return pg_catalog.jsonb_build_object(
      'status', 'saved_target_exists',
      'message', 'A saved target already exists for this account.'
    );
  end if;

  begin
    insert into public.profiles (
      user_id,
      age_years,
      sex_formula_branch,
      height_cm,
      activity_level,
      preferred_units,
      adult_confirmed_at
    )
    values (
      p_user_id,
      nullif(p_profile ->> 'age_years', '')::integer,
      nullif(p_profile ->> 'sex_formula_branch', ''),
      nullif(p_profile ->> 'height_cm', '')::numeric,
      nullif(p_profile ->> 'activity_level', ''),
      p_profile ->> 'preferred_units',
      (p_profile ->> 'adult_confirmed_at')::timestamptz
    )
    on conflict (user_id) do update set
      age_years = excluded.age_years,
      sex_formula_branch = excluded.sex_formula_branch,
      height_cm = excluded.height_cm,
      activity_level = excluded.activity_level,
      preferred_units = excluded.preferred_units,
      adult_confirmed_at = excluded.adult_confirmed_at,
      updated_at = now();

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
      calculation_inputs
    )
    values (
      p_user_id,
      p_guest_draft_id,
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
      coalesce(p_target -> 'calculation_inputs', '{}'::jsonb)
    )
    returning id into v_target_id;

    insert into public.body_logs (
      user_id,
      logged_at,
      weight_kg,
      waist_cm,
      chest_cm,
      hips_cm
    )
    values (
      p_user_id,
      coalesce(nullif(p_initial_body_log ->> 'logged_at', '')::timestamptz, now()),
      nullif(p_initial_body_log ->> 'weight_kg', '')::numeric,
      nullif(p_initial_body_log ->> 'waist_cm', '')::numeric,
      nullif(p_initial_body_log ->> 'chest_cm', '')::numeric,
      nullif(p_initial_body_log ->> 'hips_cm', '')::numeric
    );

    return pg_catalog.jsonb_build_object(
      'status', 'saved',
      'target_id', v_target_id
    );
  exception
    when unique_violation then
      select id
        into v_target_id
        from public.calorie_targets
        where user_id = p_user_id
          and guest_draft_id = p_guest_draft_id;

      if found then
        return pg_catalog.jsonb_build_object(
          'status', 'already_saved',
          'target_id', v_target_id
        );
      end if;

      if exists (
        select 1
          from public.calorie_targets
          where user_id = p_user_id
      ) then
        return pg_catalog.jsonb_build_object(
          'status', 'saved_target_exists',
          'message', 'A saved target already exists for this account.'
        );
      end if;

      raise;
  end;
end;
$$;

revoke all on function public.save_initial_guest_draft(uuid, uuid, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.save_initial_guest_draft(uuid, uuid, jsonb, jsonb, jsonb)
  to authenticated;
