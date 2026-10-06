-- MP-3: saves a whole meal plan in one transaction and returns the new meal ids in order.
-- Any error, including a label clash on meals_user_date_numbered_label_key, saves nothing.
-- Runs as the caller, so row-level security still decides which rows can be written.
create or replace function public.save_meal_plan(p_meals jsonb)
returns uuid[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_meal jsonb;
  v_meal_id uuid;
  v_meal_ids uuid[] := '{}';
begin
  if v_user_id is null then
    raise exception 'You must be signed in to save a meal plan.'
      using errcode = '42501';
  end if;

  -- 42 = 7 days x 6 meals, the meal planner placeholders. Keep in step with calculationConfig.meal_planner.
  if jsonb_typeof(p_meals) is distinct from 'array'
    or jsonb_array_length(p_meals) not between 1 and 42
  then
    raise exception 'A meal plan needs between 1 and 42 meals.'
      using errcode = '22023';
  end if;

  for v_meal in
    select meal from jsonb_array_elements(p_meals) with ordinality as plan(meal, position) order by position
  loop
    -- Plans only create numbered meals, never free-text labels.
    if (v_meal ->> 'meal_date') is null
      or coalesce(v_meal ->> 'label', '') !~ '^Meal [1-6]$'
      or jsonb_typeof(v_meal -> 'items') is distinct from 'array'
      or jsonb_array_length(v_meal -> 'items') = 0
    then
      raise exception 'Each planned meal needs a date, a label from Meal 1 to Meal 6, and at least one item.'
        using errcode = '22023';
    end if;

    insert into public.meals (user_id, meal_date, label)
    values (v_user_id, (v_meal ->> 'meal_date')::date, v_meal ->> 'label')
    returning id into v_meal_id;

    insert into public.meal_items (meal_id, food_id, grams)
    select v_meal_id, (item ->> 'food_id')::uuid, (item ->> 'grams')::numeric
      from jsonb_array_elements(v_meal -> 'items') as item;

    v_meal_ids := v_meal_ids || v_meal_id;
  end loop;

  return v_meal_ids;
end;
$$;

revoke all on function public.save_meal_plan(jsonb)
  from public, anon, authenticated;
grant execute on function public.save_meal_plan(jsonb)
  to authenticated;
