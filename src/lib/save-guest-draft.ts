import {
  calculateDefaultMacros,
  calculateTarget,
  convertAndValidateInputs,
  convertWeightToKg,
  createManualTarget,
  validateMacroEdit,
  type DefaultMacros,
} from "@/lib/calc/calculate";
import { type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import { logError } from "@/lib/log";

type UnknownRecord = Record<string, unknown>;

export type SaveGuestDraftStatus = "saved" | "already_saved" | "saved_target_exists";
export type SaveGuestDraftResult =
  | { ok: true; status: SaveGuestDraftStatus }
  | { ok: false; error: string };
type ValidationFailure = { ok: false; error: string };

export type GuestDraftRpcClient = {
  rpc: (
    functionName: "save_initial_guest_draft",
    arguments_: {
      p_user_id: string;
      p_guest_draft_id: string;
      p_profile: UnknownRecord;
      p_target: UnknownRecord;
      p_initial_body_log: UnknownRecord;
    },
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, label: string): string | ValidationFailure {
  if (typeof value !== "string" || value.trim() === "") return { ok: false, error: `${label} is required.` };
  return value;
}

function finiteNumber(value: unknown, label: string): number | ValidationFailure {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ok: false, error: `${label} must be a finite number.` };
  }
  return value;
}

function parseNumber(value: unknown, label: string): number | ValidationFailure {
  if (typeof value !== "string" || value.trim() === "") return { ok: false, error: `${label} is required.` };
  const number = Number(value);
  return Number.isFinite(number) ? number : { ok: false, error: `${label} must be a finite number.` };
}

function wholeNumber(value: unknown, label: string): number | ValidationFailure {
  const number = finiteNumber(value, label);
  if (isFailure(number) || !Number.isInteger(number)) {
    return { ok: false, error: `${label} must be a whole number.` };
  }
  return number;
}

function isFailure(value: unknown): value is ValidationFailure {
  return isRecord(value) && value.ok === false && typeof value.error === "string";
}

function isFormulaBranch(value: unknown): value is FormulaBranch {
  return value === "male" || value === "female";
}

function isActivityLevel(value: unknown): value is ActivityLevel {
  return value === "sedentary" || value === "light" || value === "moderate" || value === "very_active" || value === "extra_active";
}

function validAdultConfirmation(value: unknown): string | ValidationFailure {
  const confirmedAt = stringValue(value, "Age confirmation");
  if (isFailure(confirmedAt) || Number.isNaN(Date.parse(confirmedAt))) {
    return { ok: false, error: "Confirm that you are 18 or older before saving." };
  }
  return confirmedAt;
}

function validDraftId(value: unknown): string | ValidationFailure {
  const id = stringValue(value, "Guest draft ID");
  if (isFailure(id) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, error: "Guest draft ID is invalid." };
  }
  return id;
}

function macrosFromDraft(value: unknown, defaults: DefaultMacros, targetKcal: number): DefaultMacros | ValidationFailure {
  if (!isRecord(value)) return defaults;
  const protein_g = wholeNumber(value.protein_g, "protein_g");
  const carbs_g = wholeNumber(value.carbs_g, "carbs_g");
  const fat_g = wholeNumber(value.fat_g, "fat_g");
  const fiber_g = wholeNumber(value.fiber_g, "fiber_g");
  if ([protein_g, carbs_g, fat_g, fiber_g].some(isFailure)) {
    return { ok: false, error: "Edited macro grams must be finite numbers." };
  }
  const macros = { protein_g, carbs_g, fat_g, fiber_g } as DefaultMacros;
  const validation = validateMacroEdit(macros, targetKcal);
  return validation.ok ? validation.data : { ok: false, error: validation.error };
}

type SavePayload = {
  guestDraftId: string;
  profile: UnknownRecord;
  target: UnknownRecord;
  initialBodyLog: UnknownRecord;
};

export function buildInitialGuestDraftSave(rawDraft: unknown): { ok: true; data: SavePayload } | ValidationFailure {
  if (!isRecord(rawDraft)) return { ok: false, error: "Draft is invalid." };
  const guestDraftId = validDraftId(rawDraft.guest_draft_id);
  const adultConfirmedAt = validAdultConfirmation(rawDraft.adult_confirmed_at);
  const targetDraft = rawDraft.target;
  const setupInputs = rawDraft.setup_inputs;
  if (isFailure(guestDraftId)) return guestDraftId;
  if (isFailure(adultConfirmedAt)) return adultConfirmedAt;
  if (!isRecord(targetDraft) || !isRecord(setupInputs) || (targetDraft.source !== "calculated" && targetDraft.source !== "manual")) {
    return { ok: false, error: "Draft target details are missing or invalid." };
  }

  if (targetDraft.source === "calculated") {
    const calculate = setupInputs.calculate;
    if (!isRecord(calculate) || !isFormulaBranch(calculate.sex) || !isActivityLevel(calculate.activity)) {
      return { ok: false, error: "Calculator details are missing or invalid." };
    }
    const parsedAge = parseNumber(calculate.age, "Age");
    const age = isFailure(parsedAge) || !Number.isInteger(parsedAge)
      ? { ok: false as const, error: "Age must be a whole number." }
      : parsedAge;
    const weight = parseNumber(calculate.weight, "Weight");
    const height = calculate.units === "metric" ? parseNumber(calculate.height, "Height") : undefined;
    const feet = calculate.units === "imperial" ? parseNumber(calculate.feet, "Height") : undefined;
    const inches = calculate.units === "imperial" ? parseNumber(calculate.inches, "Height") : undefined;
    if ([age, weight, height, feet, inches].some(isFailure) || (calculate.units !== "metric" && calculate.units !== "imperial")) {
      return { ok: false, error: "Calculator measurements are missing or invalid." };
    }
    if (calculate.goal !== "lose" && calculate.goal !== "gain" && calculate.goal !== "maintain") {
      return { ok: false, error: "Choose a valid goal." };
    }
    const heightInput = calculate.units === "metric" ? { unit: "cm" as const, value: height as number } : { unit: "ft-in" as const, feet: feet as number, inches: inches as number };
    const weightInput = calculate.units === "metric" ? { unit: "kg" as const, value: weight as number } : { unit: "lb" as const, value: weight as number };
    const calculation = calculateTarget({
      age_years: age as number,
      height: heightInput,
      weight: weightInput,
      sex: calculate.sex,
      activity_level: calculate.activity,
      goal: calculate.goal,
      pace: calculate.goal === "maintain" ? undefined : calculate.pace === "gradual" || calculate.pace === "steady" ? calculate.pace : undefined,
    });
    if (!calculation.ok) return calculation;
    const validatedInputs = convertAndValidateInputs({ age_years: age as number, height: heightInput, weight: weightInput });
    if (!validatedInputs.ok) return validatedInputs;
    const defaults = calculateDefaultMacros(calculation.data.target_kcal, validatedInputs.data.weight_kg);
    if (!defaults.ok) return defaults;
    const macros = macrosFromDraft(targetDraft.macros, defaults.data, calculation.data.target_kcal);
    if (isFailure(macros)) return macros;
    return { ok: true, data: {
      guestDraftId,
      profile: { age_years: validatedInputs.data.age_years, sex_formula_branch: calculation.data.formula_branch, height_cm: validatedInputs.data.height_cm, activity_level: calculate.activity, preferred_units: calculate.units, adult_confirmed_at: adultConfirmedAt },
      target: { source: "calculated", target_kcal: calculation.data.target_kcal, goal: calculate.goal, pace: calculate.goal === "maintain" ? null : calculate.pace, protein_g: macros.protein_g, carbs_g: macros.carbs_g, fat_g: macros.fat_g, fiber_g: macros.fiber_g, formula_branch: calculation.data.formula_branch, floor_applied: calculation.data.floor_applied, config_version: calculation.data.config_version, calculation_inputs: { age_years: validatedInputs.data.age_years, height_cm: validatedInputs.data.height_cm, weight_kg: validatedInputs.data.weight_kg, activity_level: calculate.activity } },
      initialBodyLog: { weight_kg: validatedInputs.data.weight_kg },
    }};
  }

  const manual = setupInputs.manual;
  if (!isRecord(manual) || (manual.units !== "metric" && manual.units !== "imperial")) return { ok: false, error: "Manual target details are missing or invalid." };
  const targetKcal = parseNumber(manual.target_kcal, "Manual calorie target");
  const weight = parseNumber(manual.weight, "Weight");
  if (isFailure(targetKcal) || isFailure(weight)) return { ok: false, error: "Manual target details are missing or invalid." };
  const manualTarget = createManualTarget({ target_kcal: targetKcal, current_weight: manual.units === "metric" ? { unit: "kg", value: weight } : { unit: "lb", value: weight } });
  if (!manualTarget.ok) return manualTarget;
  const macros = macrosFromDraft(targetDraft.macros, manualTarget.data.macros, manualTarget.data.target_kcal);
  if (isFailure(macros)) return macros;
  const convertedWeight = convertWeightToKg(manual.units === "metric" ? { unit: "kg", value: weight } : { unit: "lb", value: weight });
  if (!convertedWeight.ok) return convertedWeight;
  return { ok: true, data: {
    guestDraftId,
    profile: { preferred_units: manual.units, adult_confirmed_at: adultConfirmedAt },
    target: { source: "manual", target_kcal: manualTarget.data.target_kcal, goal: null, pace: null, protein_g: macros.protein_g, carbs_g: macros.carbs_g, fat_g: macros.fat_g, fiber_g: macros.fiber_g, formula_branch: null, floor_applied: false, config_version: manualTarget.data.config_version, calculation_inputs: { weight_kg: convertedWeight.data } },
    initialBodyLog: { weight_kg: convertedWeight.data },
  }};
}

export async function saveInitialGuestDraft(client: GuestDraftRpcClient, userId: string | undefined, rawDraft: unknown): Promise<SaveGuestDraftResult> {
  if (!userId) return { ok: false, error: "You must be signed in to save your draft." };
  const payload = buildInitialGuestDraftSave(rawDraft);
  if (!payload.ok) return payload;
  const { data, error } = await client.rpc("save_initial_guest_draft", {
    p_user_id: userId,
    p_guest_draft_id: payload.data.guestDraftId,
    p_profile: payload.data.profile,
    p_target: payload.data.target,
    p_initial_body_log: payload.data.initialBodyLog,
  });
  // Database messages are not shown to users. The draft stays in the browser so the user can retry.
  if (error) {
    logError("guestDraft.save", error);
    return { ok: false, error: "Your targets could not be saved right now. They are still in this browser, so you can try again." };
  }
  if (!isRecord(data) || (data.status !== "saved" && data.status !== "already_saved" && data.status !== "saved_target_exists")) {
    return { ok: false, error: "The draft could not be saved." };
  }
  return { ok: true, status: data.status };
}
