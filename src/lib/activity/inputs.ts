import type { Result } from "@/lib/calc/calculate";
import { calculationConfig, type OtherActivityKey } from "@/lib/calc/config";
import { isOtherActivityKey } from "./burn";

// Checks for the steps, sleep, other-activity and workout-duration form fields. The limits come from
// calculationConfig.activity.limits, which match the database checks.

type Range = { readonly min: number; readonly max: number };

const MINUTES_PER_HOUR = 60;
const limits = calculationConfig.activity.limits;

function failure(error: string): Result<never> {
  return { ok: false, error };
}

function wholeNumber(value: string, label: string): Result<number | null> {
  const text = value.trim();
  if (text === "") return { ok: true, data: null };
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) return failure(`${label} must be a whole number.`);
  return { ok: true, data: parsed };
}

function inRange(value: number, label: string, range: Range, unit: string): Result<number> {
  if (value < range.min || value > range.max) {
    return failure(`${label} must be between ${range.min} and ${range.max}${unit}.`);
  }
  return { ok: true, data: value };
}

function requiredWhole(value: string, label: string, range: Range, unit: string): Result<number> {
  const parsed = wholeNumber(value, label);
  if (!parsed.ok) return parsed;
  if (parsed.data === null) return failure(`${label} is required.`);
  return inRange(parsed.data, label, range, unit);
}

export function validateSteps(value: string): Result<number> {
  return requiredWhole(value, "Steps", limits.steps, "");
}

// Hours and minutes to total minutes. A blank field counts as 0, but at least one must be filled.
export function validateSleep(hours: string, minutes: string): Result<number> {
  const parsedHours = wholeNumber(hours, "Hours");
  if (!parsedHours.ok) return parsedHours;
  const parsedMinutes = wholeNumber(minutes, "Minutes");
  if (!parsedMinutes.ok) return parsedMinutes;
  if (parsedHours.data === null && parsedMinutes.data === null) return failure("Enter hours, minutes or both.");

  const maxHours = Math.floor(limits.sleep_minutes.max / MINUTES_PER_HOUR);
  const h = inRange(parsedHours.data ?? 0, "Hours", { min: 0, max: maxHours }, "");
  if (!h.ok) return h;
  const m = inRange(parsedMinutes.data ?? 0, "Minutes", { min: 0, max: MINUTES_PER_HOUR - 1 }, "");
  if (!m.ok) return m;

  const total = h.data * MINUTES_PER_HOUR + m.data;
  if (total < limits.sleep_minutes.min || total > limits.sleep_minutes.max) {
    return failure(`Sleep must be between ${limits.sleep_minutes.min / MINUTES_PER_HOUR} and ${maxHours} hours.`);
  }
  return { ok: true, data: total };
}

// Saved sleep minutes back into the form's hours and minutes fields. Nothing saved gives two blank fields.
export function sleepFields(totalMinutes: number | null): { hours: string; minutes: string } {
  if (totalMinutes === null || !Number.isFinite(totalMinutes) || totalMinutes < 0) return { hours: "", minutes: "" };
  const whole = Math.round(totalMinutes);
  return { hours: String(Math.floor(whole / MINUTES_PER_HOUR)), minutes: String(whole % MINUTES_PER_HOUR) };
}

export function validateActivityMinutes(value: string): Result<number> {
  return requiredWhole(value, "Minutes", limits.activity_minutes, " minutes");
}

// Optional: a blank duration is null, and the workout estimate then uses the logged sets.
export function validateWorkoutDuration(value: string): Result<number | null> {
  const parsed = wholeNumber(value, "Duration");
  if (!parsed.ok || parsed.data === null) return parsed;
  return inRange(parsed.data, "Duration", limits.workout_duration_min, " minutes");
}

export function validateActivityKey(value: unknown): Result<OtherActivityKey> {
  if (typeof value === "string" && isOtherActivityKey(value)) return { ok: true, data: value };
  return failure("Choose an activity from the list.");
}
