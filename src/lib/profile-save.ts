import {
  calculateDefaultMacros,
  calculateTarget,
  convertAndValidateInputs,
  convertWeightToKg,
  createManualTarget,
  validateMacroEdit,
  type DefaultMacros,
  type HeightInput,
  type Result,
  type WeightInput,
} from "@/lib/calc/calculate";
import { calculationConfig, type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import type { PreferredUnits } from "@/lib/weigh-in";

// The Profile and targets form. Text fields stay text until checked here, on the browser for the
// preview and again on the server before saving. The server never trusts a calorie number from the browser.
export type ProfileFormInput = {
  method: "calculated" | "manual";
  units: PreferredUnits;
  age: string;
  height: string;
  feet: string;
  inches: string;
  weight: string;
  sex: FormulaBranch | "";
  activity: ActivityLevel | "";
  goal: "lose" | "maintain" | "gain";
  pace: "gradual" | "steady";
  targetKcal: string;
};

export type ProfileRow = {
  preferred_units: PreferredUnits;
  age_years?: number;
  sex_formula_branch?: FormulaBranch;
  height_cm?: number;
  activity_level?: ActivityLevel;
};

export type TargetRow = {
  source: "calculated" | "manual";
  target_kcal: number;
  goal: "lose" | "maintain" | "gain" | null;
  pace: "gradual" | "steady" | null;
  formula_branch: FormulaBranch | null;
  floor_applied: boolean;
  config_version: string;
  calculation_inputs: Record<string, unknown>;
};

export type ComputedTarget = {
  profile: ProfileRow;
  target: TargetRow;
  defaults: DefaultMacros;
  floor_explanation: string | null;
  // Null when the current weight was not changed, so no new weigh-in is saved.
  body_log: { weight_kg: number } | null;
};

const activities: readonly ActivityLevel[] = ["sedentary", "light", "moderate", "very_active", "extra_active"];
const lbToKg = calculationConfig.unit_conversions.pounds_to_kilograms;
const inToCm = calculationConfig.unit_conversions.inches_to_centimeters;
const inPerFoot = calculationConfig.unit_conversions.inches_per_foot;

function failure(error: string): Result<never> {
  return { ok: false, error };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parse(text: unknown): number | null {
  if (typeof text !== "string" || text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

// A weight in the form's units, to one decimal, as the form pre-fills it.
export function weightField(weightKg: number, units: PreferredUnits): string {
  return String(round1(units === "metric" ? weightKg : weightKg / lbToKg));
}

// A height in the form's units. Imperial is whole feet plus inches to one decimal.
export function heightFields(heightCm: number, units: PreferredUnits): { height: string; feet: string; inches: string } {
  if (units === "metric") return { height: String(round1(heightCm)), feet: "", inches: "" };
  const totalInches = heightCm / inToCm;
  let feet = Math.floor(totalInches / inPerFoot);
  let inches = round1(totalInches - feet * inPerFoot);
  if (inches >= inPerFoot) {
    feet += 1;
    inches = 0;
  }
  return { height: "", feet: String(feet), inches: String(inches) };
}

// The pre-filled weight is rounded to one decimal. Typing the same value back is "unchanged",
// so it never creates a new weigh-in just because of rounding or a units switch.
export function weightUnchanged(entered: number, units: PreferredUnits, latestKg: number | null): boolean {
  if (latestKg === null) return false;
  return round1(entered) === round1(units === "metric" ? latestKg : latestKg / lbToKg);
}

function readInput(raw: unknown): ProfileFormInput | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const texts = ["age", "height", "feet", "inches", "weight", "targetKcal"] as const;
  if (texts.some((name) => typeof input[name] !== "string")) return null;
  if (input.method !== "calculated" && input.method !== "manual") return null;
  if (input.units !== "metric" && input.units !== "imperial") return null;
  if (input.sex !== "" && input.sex !== "male" && input.sex !== "female") return null;
  if (input.activity !== "" && !activities.includes(input.activity as ActivityLevel)) return null;
  if (input.goal !== "lose" && input.goal !== "maintain" && input.goal !== "gain") return null;
  if (input.pace !== "gradual" && input.pace !== "steady") return null;
  return input as ProfileFormInput;
}

// Runs the existing calculation module on the form. Nothing is saved.
export function computeProfileTarget(raw: unknown, latestWeightKg: number | null): Result<ComputedTarget> {
  const input = readInput(raw);
  if (!input) return failure("Profile details are invalid.");

  const enteredWeight = parse(input.weight);
  if (enteredWeight === null) return failure("Enter your current weight as a number.");
  const unchanged = weightUnchanged(enteredWeight, input.units, latestWeightKg);
  // An unchanged weight uses the exact saved value, not the rounded one shown in the form.
  const weight: WeightInput = unchanged
    ? { unit: "kg", value: latestWeightKg as number }
    : input.units === "metric" ? { unit: "kg", value: enteredWeight } : { unit: "lb", value: enteredWeight };
  const weightKg = convertWeightToKg(weight);
  if (!weightKg.ok) return weightKg;
  const bodyLog = unchanged ? null : { weight_kg: Math.round(weightKg.data * 100) / 100 };

  if (input.method === "manual") {
    const targetKcal = parse(input.targetKcal);
    if (targetKcal === null) return failure("Enter a calorie target as a number.");
    const manual = createManualTarget({ target_kcal: targetKcal, current_weight: weight });
    if (!manual.ok) return manual;
    return {
      ok: true,
      data: {
        profile: { preferred_units: input.units },
        target: {
          source: "manual",
          target_kcal: manual.data.target_kcal,
          goal: null,
          pace: null,
          formula_branch: null,
          floor_applied: false,
          config_version: manual.data.config_version,
          calculation_inputs: { weight_kg: weightKg.data },
        },
        defaults: manual.data.macros,
        floor_explanation: null,
        body_log: bodyLog,
      },
    };
  }

  const age = parse(input.age);
  if (age === null || !Number.isInteger(age)) return failure("Enter your age as a whole number.");
  if (!input.sex) return failure("Choose Male or Female for the calorie formula.");
  if (!input.activity) return failure("Choose an activity level.");
  let height: HeightInput;
  if (input.units === "metric") {
    const cm = parse(input.height);
    if (cm === null) return failure("Enter your height as a number.");
    height = { unit: "cm", value: cm };
  } else {
    const feet = parse(input.feet);
    const inches = input.inches.trim() === "" ? 0 : parse(input.inches);
    if (feet === null || inches === null) return failure("Enter your height in feet and inches.");
    height = { unit: "ft-in", feet, inches };
  }

  const pace = input.goal === "maintain" ? undefined : input.pace;
  const calculated = calculateTarget({ age_years: age, height, weight, sex: input.sex, activity_level: input.activity, goal: input.goal, pace });
  if (!calculated.ok) return calculated;
  const validated = convertAndValidateInputs({ age_years: age, height, weight });
  if (!validated.ok) return validated;
  const defaults = calculateDefaultMacros(calculated.data.target_kcal, validated.data.weight_kg);
  if (!defaults.ok) return defaults;

  const heightCm = Math.round(validated.data.height_cm * 100) / 100;
  return {
    ok: true,
    data: {
      profile: {
        preferred_units: input.units,
        age_years: age,
        sex_formula_branch: calculated.data.formula_branch,
        height_cm: heightCm,
        activity_level: input.activity,
      },
      target: {
        source: "calculated",
        target_kcal: calculated.data.target_kcal,
        goal: input.goal,
        pace: pace ?? null,
        formula_branch: calculated.data.formula_branch,
        floor_applied: calculated.data.floor_applied,
        config_version: calculated.data.config_version,
        calculation_inputs: { age_years: age, height_cm: heightCm, weight_kg: validated.data.weight_kg, activity_level: input.activity },
      },
      defaults: defaults.data,
      floor_explanation: calculated.data.floor_explanation,
      body_log: bodyLog,
    },
  };
}

// Edited macros must be whole grams and pass the existing macro rules for the new calorie target.
export function readMacros(raw: unknown, targetKcal: number): Result<DefaultMacros> {
  if (!raw || typeof raw !== "object") return failure("Enter grams for protein, carbohydrates, fat, and fiber.");
  const input = raw as Record<string, unknown>;
  const names = ["protein_g", "carbs_g", "fat_g", "fiber_g"] as const;
  if (names.some((name) => typeof input[name] !== "number" || !Number.isInteger(input[name]))) {
    return failure("Macro grams must be whole numbers.");
  }
  const macros = { protein_g: input.protein_g, carbs_g: input.carbs_g, fat_g: input.fat_g, fiber_g: input.fiber_g } as DefaultMacros;
  return validateMacroEdit(macros, targetKcal);
}

export type ProfileSave = { profile: ProfileRow; target: TargetRow & DefaultMacros; body_log: { weight_kg: number } | null };

// Everything save_profile_and_target needs, rebuilt from the form on the server.
export function buildProfileSave(raw: unknown, latestWeightKg: number | null): Result<ProfileSave> {
  const computed = computeProfileTarget((raw as { details?: unknown } | null)?.details, latestWeightKg);
  if (!computed.ok) return computed;
  const macros = readMacros((raw as { macros?: unknown } | null)?.macros, computed.data.target.target_kcal);
  if (!macros.ok) return macros;
  return {
    ok: true,
    data: { profile: computed.data.profile, target: { ...computed.data.target, ...macros.data }, body_log: computed.data.body_log },
  };
}
