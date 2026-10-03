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
