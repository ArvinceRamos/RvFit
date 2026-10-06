/** Placeholder values pending qualified review. */
const weightKgRange = { min: 30, max: 300 };

export const calculationConfig = {
  config_version: "v1-placeholders-2026-10-04",
  input_ranges: {
    age_years: { min: 18, max: 100 },
    height_cm: { min: 120, max: 230 },
    weight_kg: weightKgRange,
  },
  weigh_in_ranges: {
    weight_kg: weightKgRange,
    waist_cm: { min: 20, max: 300 },
    chest_cm: { min: 20, max: 300 },
    hips_cm: { min: 20, max: 300 },
  },
  unit_conversions: {
    pounds_to_kilograms: 0.45359237,
    inches_to_centimeters: 2.54,
    inches_per_foot: 12,
  },
  mifflin_st_jeor: {
    weight_coefficient: 10,
    height_coefficient: 6.25,
    age_coefficient: 5,
    branch_offset: { male: 5, female: -161 },
  },
  activity_multipliers: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  },
  goal_adjustments: {
    loss_paces_kcal: { gradual: 250, steady: 500 },
    maximum_loss_deficit_kcal: 500,
    gain_paces_kcal: { gradual: 100, steady: 200 },
  },
  formula_branch_floors_kcal: { male: 1500, female: 1200 },
  database_target_bounds_kcal: { min: 800, max: 6000 },
  // Placeholder per-item limit. Keep in step with meal_items_grams_max_placeholder_check in the database.
  meal_limits: { max_item_grams: 2000 },
  // Placeholder: how many foods to suggest for each of protein, carb, and fat.
  suggestions: { foods_per_role: 5 },
  // Placeholder meal planner limits and portion ranges (docs/MEAL-PLANNER.md "Realistic portions").
  meal_planner: {
    max_days: 7,
    meals_per_day: { min: 2, max: 6, default: 3 },
    max_foods_per_group: 5,
    max_foods_per_group_per_meal: 2,
    note_tolerance_fraction: 0.1,
    // Per meal. Unit classes count whole units of the food's portion_unit_g; powder units are per day, shake only.
    // Keep the class list in step with foods_portion_class_check and scripts/import-phase2-catalog.mjs.
    portions: {
      meat_fish_cooked: { min_g: 60, max_g: 225, step_g: 5 },
      meat_fish_raw: { min_g: 80, max_g: 300, step_g: 5 },
      egg: { min_units: 1, max_units: 4 },
      egg_white: { min_units: 1, max_units: 6 },
      dairy_protein: { min_g: 100, max_g: 300, step_g: 5 },
      plant_protein: { min_g: 80, max_g: 250, step_g: 5 },
      powder: { min_units: 1, max_units: 2 },
      grain_cooked: { min_g: 75, max_g: 320, step_g: 5 },
      grain_dry: { min_g: 25, max_g: 110, step_g: 5 },
      bread: { min_units: 1, max_units: 4 },
      starchy_veg: { min_g: 75, max_g: 350, step_g: 5 },
      oil: { min_g: 2, max_g: 14, step_g: 1 },
      nut_seed: { min_g: 10, max_g: 40, step_g: 5 },
      avocado_olive: { min_g: 30, max_g: 150, step_g: 5 },
      dairy_fat: { min_g: 15, max_g: 60, step_g: 5 },
    },
  },
  // Placeholder progress rules pending qualified review. The trend is a plain average, not medical advice.
  progress: { trend_window_days: 7, trend_min_weigh_ins: 3, history_weigh_ins: 20, workout_weeks: 8 },
  // Placeholder workout limits and schemes. Keep limits in step with the workout_log_sets_*_placeholder_check constraints.
  workouts: {
    max_sets_per_exercise: 10,
    max_reps: 100,
    max_seconds: 600,
    max_weight_kg: 500,
    weight_step_kg: { upper: 2.5, lower: 5 },
    extra_reps_unloaded: 2,
    extra_seconds_hold: 5,
    schemes: {
      beginner: {
        sets: { min: 2, max: 3 },
        reps: { min: 8, max: 12 },
        rest_seconds: { min: 60, max: 90 },
        hold_seconds: { min: 20, max: 40 },
      },
      intermediate: {
        sets: { min: 3, max: 4 },
        reps: { min: 6, max: 12 },
        rest_seconds: { min: 60, max: 120 },
        hold_seconds: { min: 30, max: 60 },
      },
    },
  },
  macros: {
    protein_grams_per_kg: 1.6,
    protein_calorie_cap_fraction: 0.35,
    fat_minimum_calorie_fraction: 0.2,
    fiber_grams_per_1000_kcal: 14,
    fiber_calorie_basis_kcal: 1000,
    kcal_per_gram: { protein: 4, carbohydrate: 4, fat: 9 },
    mismatch_tolerance_fraction: 0.05,
    minimum_grams: 0,
    percentage_scale: 100,
  },
} as const;

export type CalculationConfig = typeof calculationConfig;
export type ActivityLevel = keyof typeof calculationConfig.activity_multipliers;
export type FormulaBranch = keyof typeof calculationConfig.formula_branch_floors_kcal;
export type PortionClass = keyof typeof calculationConfig.meal_planner.portions;
