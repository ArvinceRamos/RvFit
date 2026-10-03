import {
  calculationConfig,
  type ActivityLevel,
  type FormulaBranch,
} from "./config";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type WeightInput =
  | { unit: "kg"; value: number }
  | { unit: "lb"; value: number };

export type HeightInput =
  | { unit: "cm"; value: number }
  | { unit: "ft-in"; feet: number; inches: number };

export type CalculatorInputs = {
  age_years: number;
  height: HeightInput;
  weight: WeightInput;
};

export type ValidatedInputs = {
  age_years: number;
  height_cm: number;
  weight_kg: number;
};

export type DefaultMacros = {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type MacroEdit = DefaultMacros;

export type SexInput = FormulaBranch;
export type GoalInput = "lose" | "gain" | "maintain";
export type PaceInput = "gradual" | "steady";

function success<T>(data: T): Result<T> {
  return { ok: true, data };
}

function failure<T = never>(error: string): Result<T> {
  return { ok: false, error };
}

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function hasOwnKey<T extends object>(record: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function convertWeightToKg(weight: WeightInput): Result<number> {
  if (!isFiniteNumber(weight.value)) {
    return failure("Weight must be a finite number.");
  }

  if (weight.unit === "kg") return success(weight.value);
  if (weight.unit === "lb") {
    return success(weight.value * calculationConfig.unit_conversions.pounds_to_kilograms);
  }
  return failure("Choose kilograms or pounds for weight.");
}

function convertHeightToCm(height: HeightInput): Result<number> {
  if (height.unit === "cm") {
    return isFiniteNumber(height.value)
      ? success(height.value)
      : failure("Height must be a finite number.");
  }

  if (!isFiniteNumber(height.feet) || !isFiniteNumber(height.inches)) {
    return failure("Height must use finite feet and inches values.");
  }

  const totalInches =
    height.feet * calculationConfig.unit_conversions.inches_per_foot + height.inches;
  return success(totalInches * calculationConfig.unit_conversions.inches_to_centimeters);
}

export function convertAndValidateInputs(inputs: CalculatorInputs): Result<ValidatedInputs> {
  if (!isFiniteNumber(inputs.age_years)) {
    return failure("Age must be a finite number.");
  }

  if (inputs.age_years < calculationConfig.input_ranges.age_years.min) {
    return failure(
      `You must be at least ${calculationConfig.input_ranges.age_years.min} years old to use the calculator.`,
    );
  }
  if (inputs.age_years > calculationConfig.input_ranges.age_years.max) {
    return failure(
      `Age must be between ${calculationConfig.input_ranges.age_years.min} and ${calculationConfig.input_ranges.age_years.max} years.`,
    );
  }

  const heightResult = convertHeightToCm(inputs.height);
  if (!heightResult.ok) return heightResult;
  const weightResult = convertWeightToKg(inputs.weight);
  if (!weightResult.ok) return weightResult;

  const height_cm = heightResult.data;
  const weight_kg = weightResult.data;
  const heightRange = calculationConfig.input_ranges.height_cm;
  if (height_cm < heightRange.min || height_cm > heightRange.max) {
    return failure(`Height must be between ${heightRange.min} and ${heightRange.max} cm.`);
  }

  const weightRange = calculationConfig.input_ranges.weight_kg;
  if (weight_kg < weightRange.min || weight_kg > weightRange.max) {
    return failure(`Weight must be between ${weightRange.min} and ${weightRange.max} kg.`);
  }

  return success({ age_years: inputs.age_years, height_cm, weight_kg });
}

export type CalculateTargetInput = CalculatorInputs & {
  sex: SexInput;
  activity_level: ActivityLevel;
  goal: GoalInput;
  pace?: PaceInput;
};

export type CalculatedTarget = {
  target_kcal: number;
  floor_applied: boolean;
  floor_explanation: string | null;
  formula_branch: FormulaBranch;
  config_version: string;
};

export function calculateTarget(input: CalculateTargetInput): Result<CalculatedTarget> {
  const validated = convertAndValidateInputs(input);
  if (!validated.ok) return validated;

  if (!hasOwnKey(calculationConfig.formula_branch_floors_kcal, input.sex)) {
    return failure("Choose Male or Female for the calorie formula.");
  }
  if (!hasOwnKey(calculationConfig.activity_multipliers, input.activity_level)) {
    return failure("Choose a valid activity level.");
  }

  const branch = input.sex;
  const formula = calculationConfig.mifflin_st_jeor;
  const basalEstimate =
    formula.weight_coefficient * validated.data.weight_kg +
    formula.height_coefficient * validated.data.height_cm -
    formula.age_coefficient * validated.data.age_years +
    formula.branch_offset[branch];
  const maintenanceEstimate =
    basalEstimate * calculationConfig.activity_multipliers[input.activity_level];

  let adjustedEstimate = maintenanceEstimate;
  if (input.goal === "lose") {
    if (!input.pace || !hasOwnKey(calculationConfig.goal_adjustments.loss_paces_kcal, input.pace)) {
      return failure("Choose a gradual or steady pace for weight loss.");
    }
    const selectedDeficit =
      calculationConfig.goal_adjustments.loss_paces_kcal[input.pace];
    const deficit = Math.min(
      selectedDeficit,
      calculationConfig.goal_adjustments.maximum_loss_deficit_kcal,
    );
    adjustedEstimate -= deficit;
  } else if (input.goal === "gain") {
    if (!input.pace || !hasOwnKey(calculationConfig.goal_adjustments.gain_paces_kcal, input.pace)) {
      return failure("Choose a gradual or steady pace for weight gain.");
    }
    adjustedEstimate += calculationConfig.goal_adjustments.gain_paces_kcal[input.pace];
  } else if (input.goal !== "maintain") {
    return failure("Choose weight loss, maintenance, or weight gain.");
  }

  const floor = calculationConfig.formula_branch_floors_kcal[branch];
  const floorApplied = adjustedEstimate < floor;
  return success({
    target_kcal: Math.round(floorApplied ? floor : adjustedEstimate),
    floor_applied: floorApplied,
    floor_explanation: floorApplied
      ? `The estimate was below the ${branch} formula floor, so the target is set to ${floor} kcal.`
      : null,
    formula_branch: branch,
    config_version: calculationConfig.config_version,
  });
}

export function calculateDefaultMacros(
  targetKcal: number,
  currentWeightKg: number,
): Result<DefaultMacros> {
  if (!isFiniteNumber(targetKcal) || targetKcal <= calculationConfig.macros.minimum_grams) {
    return failure("Calorie target must be a positive finite number.");
  }
  if (!isFiniteNumber(currentWeightKg)) {
    return failure("Current weight must be a finite number.");
  }
  const weightRange = calculationConfig.input_ranges.weight_kg;
  if (currentWeightKg < weightRange.min || currentWeightKg > weightRange.max) {
    return failure(`Weight must be between ${weightRange.min} and ${weightRange.max} kg.`);
  }

  const target = Math.round(targetKcal);
  const macroConfig = calculationConfig.macros;
  const proteinFromWeight = Math.round(currentWeightKg * macroConfig.protein_grams_per_kg);
  const maxProteinGrams = Math.floor(
    (target * macroConfig.protein_calorie_cap_fraction) / macroConfig.kcal_per_gram.protein,
  );
  const protein = Math.min(proteinFromWeight, maxProteinGrams);
  const fat = Math.ceil(
    (target * macroConfig.fat_minimum_calorie_fraction) / macroConfig.kcal_per_gram.fat,
  );
  const remainingCalories =
    target - protein * macroConfig.kcal_per_gram.protein - fat * macroConfig.kcal_per_gram.fat;

  return success({
    protein_g: protein,
    fat_g: fat,
    carbs_g: Math.round(remainingCalories / macroConfig.kcal_per_gram.carbohydrate),
    fiber_g: Math.round(
      (target * macroConfig.fiber_grams_per_1000_kcal) /
        macroConfig.fiber_calorie_basis_kcal,
    ),
  });
}

export type ManualTargetInput = {
  target_kcal: number;
  current_weight: WeightInput;
};

export type ManualTarget = {
  target_kcal: number;
  macros: DefaultMacros;
  config_version: string;
};

export function createManualTarget(input: ManualTargetInput): Result<ManualTarget> {
  if (!isFiniteNumber(input.target_kcal)) {
    return failure("Manual calorie target must be a finite number.");
  }

  const bounds = calculationConfig.database_target_bounds_kcal;
  if (input.target_kcal < bounds.min || input.target_kcal > bounds.max) {
    return failure(`Manual calorie target must be between ${bounds.min} and ${bounds.max} kcal.`);
  }

  const lowestFormulaFloor = Math.min(
    ...Object.values(calculationConfig.formula_branch_floors_kcal),
  );
  if (input.target_kcal < lowestFormulaFloor) {
    return failure(
      `Manual calorie target cannot be below the configured minimum of ${lowestFormulaFloor} kcal.`,
    );
  }

  const weightResult = convertWeightToKg(input.current_weight);
  if (!weightResult.ok) return weightResult;
  const weightRange = calculationConfig.input_ranges.weight_kg;
  if (weightResult.data < weightRange.min || weightResult.data > weightRange.max) {
    return failure(`Weight must be between ${weightRange.min} and ${weightRange.max} kg.`);
  }

  const macros = calculateDefaultMacros(input.target_kcal, weightResult.data);
  if (!macros.ok) return macros;

  return success({
    target_kcal: Math.round(input.target_kcal),
    macros: macros.data,
    config_version: calculationConfig.config_version,
  });
}

export function validateMacroEdit(
  macroEdit: MacroEdit,
  targetKcal: number,
): Result<MacroEdit> {
  const macroEntries = Object.entries(macroEdit) as [keyof MacroEdit, number][];
  for (const [name, grams] of macroEntries) {
    if (!isFiniteNumber(grams)) return failure(`${name} must be a finite number.`);
    if (grams < calculationConfig.macros.minimum_grams) {
      return failure(`${name} grams cannot be negative.`);
    }
  }
  if (!isFiniteNumber(targetKcal) || targetKcal <= calculationConfig.macros.minimum_grams) {
    return failure("Calorie target must be a positive finite number.");
  }

  const proteinCalories =
    macroEdit.protein_g * calculationConfig.macros.kcal_per_gram.protein;
  if (proteinCalories > targetKcal * calculationConfig.macros.protein_calorie_cap_fraction) {
    const capPercent =
      calculationConfig.macros.protein_calorie_cap_fraction *
      calculationConfig.macros.percentage_scale;
    return failure(`Protein cannot exceed ${capPercent}% of target calories.`);
  }

  return success(macroEdit);
}

export type MacroMismatch = {
  macro_derived_kcal: number;
  difference_fraction: number;
  warning: boolean;
};

export function checkMacroMismatch(
  macroEdit: MacroEdit,
  targetKcal: number,
): Result<MacroMismatch> {
  const validEdit = validateMacroEdit(macroEdit, targetKcal);
  if (!validEdit.ok) return validEdit;
  if (!isFiniteNumber(targetKcal) || targetKcal <= calculationConfig.macros.minimum_grams) {
    return failure("Calorie target must be a positive finite number.");
  }
  const macroEntries = Object.values(macroEdit);
  if (macroEntries.some((grams) => !isFiniteNumber(grams))) {
    return failure("Macro grams must be finite numbers.");
  }

  const macroCalories =
    macroEdit.protein_g * calculationConfig.macros.kcal_per_gram.protein +
    macroEdit.carbs_g * calculationConfig.macros.kcal_per_gram.carbohydrate +
    macroEdit.fat_g * calculationConfig.macros.kcal_per_gram.fat;
  const difference = Math.abs(macroCalories - targetKcal) / targetKcal;
  return success({
    macro_derived_kcal: macroCalories,
    difference_fraction: difference,
    warning: difference > calculationConfig.macros.mismatch_tolerance_fraction,
  });
}
