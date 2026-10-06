-- MP-7: a reviewed portion class for each Protein, Carbs, and Fats food (docs/portion-classes-review.csv).
-- Ranges per class are placeholders in calculationConfig.meal_planner. Keep the class list in step with
-- that config and with scripts/import-phase2-catalog.mjs.
alter table public.foods
  add column portion_class text,
  -- Grams in one unit, only for classes counted in whole units. Taken from a catalog measure.
  add column portion_unit_g numeric(6, 2);

alter table public.foods
  add constraint foods_portion_class_check check (
    portion_class is null or portion_class in (
      'meat_fish_cooked', 'meat_fish_raw', 'egg', 'egg_white', 'dairy_protein', 'plant_protein', 'powder',
      'grain_cooked', 'grain_dry', 'bread', 'starchy_veg',
      'oil', 'nut_seed', 'avocado_olive', 'dairy_fat'
    )
  ),
  -- Only meal planner foods have a portion class.
  add constraint foods_portion_class_role_check check (
    portion_class is null or role in ('protein', 'carb', 'fat')
  ),
  -- Unit classes need a unit size; every other food has none.
  add constraint foods_portion_unit_check check (
    case
      when portion_class in ('egg', 'egg_white', 'powder', 'bread') then portion_unit_g is not null and portion_unit_g > 0
      else portion_unit_g is null
    end
  );
