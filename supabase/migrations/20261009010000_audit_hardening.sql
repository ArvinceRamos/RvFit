-- Small hardening from the October 2026 security audit. Adds limits only; no data is changed or removed.

-- 1. Phase 1 tables: match the later migrations and give anon no table rights at all.
--    RLS already blocks anon (policies are "to authenticated"); this removes the default grants as well.
revoke all on public.profiles, public.calorie_targets, public.body_logs from anon;

-- 2. Body log sanity bounds. The app checks the real ranges (calculationConfig.weigh_in_ranges); these
--    only stop impossible values sent straight to the API. "not valid" skips checking existing rows,
--    so this cannot fail on old data, but every new or changed row is checked.
alter table public.body_logs
  add constraint body_logs_weight_kg_sane_check check (weight_kg is null or (weight_kg > 0 and weight_kg < 1000)) not valid,
  add constraint body_logs_waist_cm_sane_check check (waist_cm is null or (waist_cm > 0 and waist_cm < 1000)) not valid,
  add constraint body_logs_chest_cm_sane_check check (chest_cm is null or (chest_cm > 0 and chest_cm < 1000)) not valid,
  add constraint body_logs_hips_cm_sane_check check (hips_cm is null or (hips_cm > 0 and hips_cm < 1000)) not valid;

-- 3. save_meal: at most 30 items in one meal (keep in step with calculationConfig.meal_limits.max_items).
--    Same function as 20261006050000_phase2_save_meal.sql plus the item cap.
create or replace function public.save_meal(
  p_meal_id uuid,
  p_meal_date date,
  p_label text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_meal_id uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to save a meal.'
      using errcode = '42501';
  end if;

  if p_meal_date is null
    or p_label is null
    or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) = 0
  then
    raise exception 'Meal date, label, and at least one item are required.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 30 then
    raise exception 'A meal can have at most 30 foods.'
      using errcode = '22023';
  end if;

  if p_meal_id is null then
    insert into public.meals (user_id, meal_date, label)
    values (v_user_id, p_meal_date, p_label)
    returning id into v_meal_id;
  else
    update public.meals
      set meal_date = p_meal_date,
          label = p_label,
          updated_at = now()
      where id = p_meal_id
        and user_id = v_user_id
      returning id into v_meal_id;

    if v_meal_id is null then
      raise exception 'Meal not found.'
        using errcode = 'P0002';
    end if;

    delete from public.meal_items
      where meal_id = v_meal_id;
  end if;

  insert into public.meal_items (meal_id, food_id, grams)
  select v_meal_id, (item ->> 'food_id')::uuid, (item ->> 'grams')::numeric
    from jsonb_array_elements(p_items) as item;

  return v_meal_id;
end;
$$;

revoke all on function public.save_meal(uuid, date, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_meal(uuid, date, text, jsonb)
  to authenticated;
