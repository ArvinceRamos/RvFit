import { validateMacroEdit, type DefaultMacros, type Result } from "@/lib/calc/calculate";
import { calculationConfig, type FormulaBranch } from "@/lib/calc/config";
import type { CheckInGoal, CheckInPace } from "@/lib/check-in";
import type { TargetRow } from "@/lib/profile-save";

// Accepting a check-in saves a new target row (targets are append-only) that keeps the goal, pace
// and macro split. It stays a goal-based ("calculated") target; calculation_inputs.check_in records
// that the number came from a check-in, so Profile can say so.

const { kcal_per_gram: perGram, protein_calorie_cap_fraction, fat_minimum_calorie_fraction } = calculationConfig.macros;

// Protein grams stay (they come from body weight, not calories), capped at 35% of the new target.
// Fat and carbs keep their share of the calories left after protein. Fiber moves with calories.
// A fat share that met the 20% default minimum still meets it after the change.
export function checkInMacros(current: DefaultMacros, fromKcal: number, toKcal: number): Result<DefaultMacros> {
  const protein_g = Math.min(current.protein_g, Math.floor((toKcal * protein_calorie_cap_fraction) / perGram.protein));
  const rest = toKcal - protein_g * perGram.protein;
  const fatKcal = current.fat_g * perGram.fat;
  const carbKcal = current.carbs_g * perGram.carbohydrate;
  const fatShare = fatKcal + carbKcal > 0 ? fatKcal / (fatKcal + carbKcal) : 0;
  const minimumFat = Math.ceil((toKcal * fat_minimum_calorie_fraction) / perGram.fat);
  const metMinimum = fatKcal >= fromKcal * fat_minimum_calorie_fraction;
  let fat_g = Math.round((rest * fatShare) / perGram.fat);
  if (metMinimum || fatKcal + carbKcal === 0) fat_g = Math.max(fat_g, minimumFat);
  const carbs_g = Math.max(0, Math.round((rest - fat_g * perGram.fat) / perGram.carbohydrate));
  const fiber_g = Math.round((current.fiber_g * toKcal) / fromKcal);
  return validateMacroEdit({ protein_g, carbs_g, fat_g, fiber_g }, toKcal);
}

export type CheckInSaveInput = {
  fromKcal: number;
  toKcal: number;
  macros: DefaultMacros;
  goal: CheckInGoal;
  pace: CheckInPace | null;
  branch: FormulaBranch | null;
  observedKgPerWeek: number;
  expectedKgPerWeek: number;
};

// The row save_profile_and_target inserts. Built on the server from saved data only.
export function buildCheckInTarget(input: CheckInSaveInput): Result<TargetRow & DefaultMacros> {
  if (!input.branch) return { ok: false, error: "Set your details in Profile before using a check-in." };
  const pace = input.goal === "maintain" ? null : input.pace;
  if (input.goal !== "maintain" && !pace) return { ok: false, error: "Choose a pace in Profile before using a check-in." };
  const macros = checkInMacros(input.macros, input.fromKcal, input.toKcal);
  if (!macros.ok) return macros;
  const floor = calculationConfig.formula_branch_floors_kcal[input.branch];
  const round3 = (value: number) => Math.round(value * 1000) / 1000;
  return {
    ok: true,
    data: {
      source: "calculated",
      target_kcal: input.toKcal,
      goal: input.goal,
      pace,
      formula_branch: input.branch,
      floor_applied: input.toKcal <= floor,
      config_version: calculationConfig.config_version,
      calculation_inputs: {
        check_in: {
          from_kcal: input.fromKcal,
          change_kcal: input.toKcal - input.fromKcal,
          observed_kg_per_week: round3(input.observedKgPerWeek),
          expected_kg_per_week: round3(input.expectedKgPerWeek),
        },
      },
      ...macros.data,
    },
  };
}
