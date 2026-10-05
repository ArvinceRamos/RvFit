-- Saves a meal and all of its items in one transaction, for a new meal or an edit.
-- Runs as the caller, so row-level security still decides which meals can be touched.
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
