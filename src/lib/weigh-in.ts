import { calculationConfig } from "@/lib/calc/config";
import type { Result } from "@/lib/calc/calculate";

export type PreferredUnits = "metric" | "imperial";

export type WeighInFields = {
  weight: string;
  waist: string;
  chest: string;
  hips: string;
};

export type ValidWeighIn = {
  weight_kg: number;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
};

export function readWeighInFields(value: unknown): Result<WeighInFields> {
  if (!value || typeof value !== "object") return failure("Weigh-in details are invalid.");
  const fields = value as Record<string, unknown>;
  const names: (keyof WeighInFields)[] = ["weight", "waist", "chest", "hips"];
  if (names.some((name) => typeof fields[name] !== "string")) {
    return failure("Weigh-in details are invalid.");
  }
  return {
    ok: true,
    data: {
      weight: fields.weight as string,
      waist: fields.waist as string,
      chest: fields.chest as string,
      hips: fields.hips as string,
    },
  };
}

function failure(error: string): Result<never> {
  return { ok: false, error };
}

function parseRequired(value: string, label: string): Result<number> {
  if (value.trim() === "") return failure(`${label} is required.`);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { ok: true, data: parsed } : failure(`${label} must be a number.`);
}

function parseOptional(value: string, label: string): Result<number | null> {
  if (value.trim() === "") return { ok: true, data: null };
  const parsed = Number(value);
  return Number.isFinite(parsed) ? { ok: true, data: parsed } : failure(`${label} must be a number.`);
}

function toKilograms(value: number, units: PreferredUnits): number {
  return units === "metric" ? value : value * calculationConfig.unit_conversions.pounds_to_kilograms;
}

function toCentimeters(value: number, units: PreferredUnits): number {
  return units === "metric" ? value : value * calculationConfig.unit_conversions.inches_to_centimeters;
}

function validateRange(value: number, label: string, range: { min: number; max: number }, unit: string): Result<number> {
  if (value < range.min || value > range.max) {
    return failure(`${label} must be between ${range.min} and ${range.max} ${unit}.`);
  }
  return { ok: true, data: value };
}

function optionalMeasurement(
  value: string,
  label: string,
  units: PreferredUnits,
  range: { min: number; max: number },
): Result<number | null> {
  const parsed = parseOptional(value, label);
  if (!parsed.ok || parsed.data === null) return parsed;
  const centimeters = toCentimeters(parsed.data, units);
  const valid = validateRange(centimeters, label, range, "cm");
  return valid.ok ? { ok: true, data: valid.data } : valid;
}

export function validateWeighIn(fields: WeighInFields, units: PreferredUnits): Result<ValidWeighIn> {
  const weight = parseRequired(fields.weight, "Weight");
  if (!weight.ok) return weight;
  const weightKg = toKilograms(weight.data, units);
  const validWeight = validateRange(
    weightKg,
    "Weight",
    calculationConfig.weigh_in_ranges.weight_kg,
    "kg",
  );
  if (!validWeight.ok) return validWeight;

  const waist = optionalMeasurement(fields.waist, "Waist", units, calculationConfig.weigh_in_ranges.waist_cm);
  if (!waist.ok) return waist;
  const chest = optionalMeasurement(fields.chest, "Chest", units, calculationConfig.weigh_in_ranges.chest_cm);
  if (!chest.ok) return chest;
  const hips = optionalMeasurement(fields.hips, "Hips", units, calculationConfig.weigh_in_ranges.hips_cm);
  if (!hips.ok) return hips;

  return {
    ok: true,
    data: {
      weight_kg: validWeight.data,
      waist_cm: waist.data,
      chest_cm: chest.data,
      hips_cm: hips.data,
    },
  };
}

// Weights are stored in kg. Show them in the user's units, to one decimal.
export function formatWeightKg(weightKg: number, units: PreferredUnits): string {
  if (units === "metric") return `${weightKg.toFixed(1)} kg`;
  return `${(weightKg / calculationConfig.unit_conversions.pounds_to_kilograms).toFixed(1)} lb`;
}

// Body measurements are stored in cm. Show them in the user's units, to one decimal.
export function formatLengthCm(lengthCm: number, units: PreferredUnits): string {
  if (units === "metric") return `${lengthCm.toFixed(1)} cm`;
  return `${(lengthCm / calculationConfig.unit_conversions.inches_to_centimeters).toFixed(1)} in`;
}
