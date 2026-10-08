import type { Result } from "@/lib/calc/calculate";
import { calculationConfig } from "@/lib/calc/config";
import { isCalendarDate, isUuid } from "@/lib/meal";
import type { PreferredUnits } from "@/lib/weigh-in";
import { getExercise } from "./exercises";
import { choiceLabel, restText, schemeText } from "./format";
import { applySwaps, resolveTemplateByKey, schemeFor, swapOptions, type Swap, type Template, type TemplateDay, type TemplateSlot } from "./templates";
import type { Exercise, Measure, MovementPattern } from "./types";

const limits = calculationConfig.workouts;
export const maxSetsPerExercise = limits.max_sets_per_exercise;

export type LogChoice = {
  key: string;
  label: string;
  measure: Measure;
  loaded: boolean;
  pattern: MovementPattern;
  /** Top of the planned rep range, or top seconds for a hold. */
  topOfRange: number;
  /** A one-line form cue, when the exercise has one. */
  cue?: string;
};

export type LogSlot = {
  slotKey: string;
  plannedExerciseKey: string;
  plannedSets: number;
  planText: string;
  /** The planned exercise first, then the other valid options. */
  choices: LogChoice[];
};

export type SetFields = { amount: string; weight: string };
export type EntryFields = { slotKey: string; exerciseKey: string; sets: SetFields[] };

export type ValidSet = {
  slot_key: string;
  exercise_key: string;
  set_number: number;
  reps: number | null;
  seconds: number | null;
  weight_kg: number | null;
};

export type ValidWorkoutLog = {
  log_id: string | null;
  template_key: string;
  day_key: string;
  performed_on: string;
  sets: ValidSet[];
};

export type LogRules = {
  units: PreferredUnits;
  /** The user's saved swaps for this template, oldest first. */
  swaps: readonly Swap[];
  /** When editing: the exercise already saved for each slot. It stays allowed even if it is retired or no longer an option. */
  savedExercises: ReadonlyMap<string, string>;
};

function failure(error: string): Result<never> {
  return { ok: false, error };
}

function toChoice(exercise: Exercise, slot: TemplateSlot, template: Template): LogChoice {
  return {
    key: exercise.key,
    label: choiceLabel(exercise),
    measure: exercise.measure,
    loaded: exercise.loaded,
    pattern: exercise.pattern,
    topOfRange: schemeFor(slot.baseScheme, exercise, template.level).reps.max,
    cue: exercise.cue,
  };
}

// Exercises the user may log for one slot: the planned one (default or swap), the other valid swap options,
// and, when editing, the exercise already saved for that slot.
function allowedExercises(template: Template, day: TemplateDay, slotKey: string, savedKey?: string): Exercise[] {
  const slot = day.slots.find((item) => item.key === slotKey);
  if (!slot) return [];
  const list = [slot.exercise, ...swapOptions(template, slotKey)];
  const saved = savedKey ? getExercise(savedKey) : undefined;
  if (saved && !list.some((exercise) => exercise.key === saved.key)) list.push(saved);
  return list;
}

/** The planned template for logging: the template with the user's saved swaps applied. */
export function planForLog(templateKey: string, swaps: readonly Swap[]): Template | null {
  const template = resolveTemplateByKey(templateKey);
  return template ? applySwaps(template, swaps) : null;
}

export function logSlots(template: Template, dayKey: string, savedExercises: ReadonlyMap<string, string>): LogSlot[] | null {
  const day = template.days.find((item) => item.key === dayKey);
  if (!day) return null;
  return day.slots.map((slot) => ({
    slotKey: slot.key,
    plannedExerciseKey: slot.exercise.key,
    plannedSets: slot.scheme.sets,
    planText: `${schemeText(slot.scheme, slot.exercise)} · ${restText(slot.scheme)}`,
    choices: allowedExercises(template, day, slot.key, savedExercises.get(slot.key)).map((exercise) => toChoice(exercise, slot, template)),
  }));
}

export function weightUnit(units: PreferredUnits): "kg" | "lb" {
  return units === "metric" ? "kg" : "lb";
}

/** A stored weight shown in the user's units, rounded to one decimal. */
export function formatWeight(weightKg: number, units: PreferredUnits): string {
  const shown = units === "metric" ? weightKg : weightKg / calculationConfig.unit_conversions.pounds_to_kilograms;
  return String(Math.round(shown * 10) / 10);
}

/**
 * Re-expresses a typed weight in the other unit when the user flips the kg/lb switch.
 * Blank or unreadable text is left alone. kg keeps 2 decimals (the stored precision) and lb keeps 1,
 * so switching back and forth does not drift.
 */
export function convertWeightText(text: string, from: PreferredUnits, to: PreferredUnits): string {
  if (from === to || text.trim() === "") return text;
  const value = Number(text);
  if (!Number.isFinite(value)) return text;
  const factor = calculationConfig.unit_conversions.pounds_to_kilograms;
  if (to === "metric") return String(Math.round(value * factor * 100) / 100);
  return String(Math.round((value / factor) * 10) / 10);
}

/** The units chosen on the form. A missing choice means the saved profile units. */
export function resolveUnits(chosen: unknown, saved: PreferredUnits): Result<PreferredUnits> {
  if (chosen === undefined || chosen === null) return { ok: true, data: saved };
  if (chosen === "metric" || chosen === "imperial") return { ok: true, data: chosen };
  return failure("Choose kg or lb.");
}

function isBlank(value: string): boolean {
  return value.trim() === "";
}

function parseAmount(text: string, measure: Measure, label: string): Result<number> {
  const unit = measure === "seconds" ? "Seconds" : "Reps";
  const max = measure === "seconds" ? limits.max_seconds : limits.max_reps;
  const value = Number(text);
  if (!Number.isInteger(value)) return failure(`${label}: ${unit} must be a whole number.`);
  if (value < 1 || value > max) return failure(`${label}: ${unit} must be between 1 and ${max}.`);
  return { ok: true, data: value };
}

function parseWeight(text: string, units: PreferredUnits, label: string): Result<number> {
  const value = Number(text);
  if (!Number.isFinite(value)) return failure(`${label}: Weight must be a number.`);
  const kilograms = units === "metric" ? value : value * calculationConfig.unit_conversions.pounds_to_kilograms;
  const rounded = Math.round(kilograms * 100) / 100;
  if (rounded <= 0) return failure(`${label}: Weight must be more than 0.`);
  if (rounded > limits.max_weight_kg) {
    const max = units === "metric" ? limits.max_weight_kg : Math.floor(limits.max_weight_kg / calculationConfig.unit_conversions.pounds_to_kilograms);
    return failure(`${label}: Weight can be at most ${max} ${weightUnit(units)}.`);
  }
  return { ok: true, data: rounded };
}

function readEntries(value: unknown): EntryFields[] | null {
  if (!Array.isArray(value)) return null;
  const entries: EntryFields[] = [];
  for (const raw of value) {
    const entry = raw as Record<string, unknown> | null;
    if (!entry || typeof entry !== "object") return null;
    if (typeof entry.slotKey !== "string" || typeof entry.exerciseKey !== "string" || !Array.isArray(entry.sets)) return null;
    const sets: SetFields[] = [];
    for (const rawSet of entry.sets) {
      const set = rawSet as Record<string, unknown> | null;
      if (!set || typeof set.amount !== "string" || typeof set.weight !== "string") return null;
      sets.push({ amount: set.amount, weight: set.weight });
    }
    entries.push({ slotKey: entry.slotKey, exerciseKey: entry.exerciseKey, sets });
  }
  return entries;
}

export function validateWorkoutLog(raw: unknown, rules: LogRules): Result<ValidWorkoutLog> {
  const invalid = "Workout details are invalid.";
  if (!raw || typeof raw !== "object") return failure(invalid);
  const input = raw as Record<string, unknown>;

  const logId = input.logId ?? null;
  if (logId !== null && !isUuid(logId)) return failure(invalid);
  if (typeof input.templateKey !== "string" || typeof input.dayKey !== "string") return failure(invalid);
  if (typeof input.date !== "string" || !isCalendarDate(input.date)) return failure("Choose a valid date.");

  const template = planForLog(input.templateKey, rules.swaps);
  if (!template) return failure("This workout plan was not found.");
  const day = template.days.find((item) => item.key === input.dayKey);
  if (!day) return failure("This workout day was not found.");

  const entries = readEntries(input.entries);
  if (!entries) return failure(invalid);

  const seenSlots = new Set<string>();
  const usedExercises = new Set<string>();
  const sets: ValidSet[] = [];

  for (const entry of entries) {
    if (seenSlots.has(entry.slotKey)) return failure(invalid);
    seenSlots.add(entry.slotKey);
    if (!day.slots.some((slot) => slot.key === entry.slotKey)) return failure(invalid);
    if (entry.sets.length > maxSetsPerExercise) return failure(`Log at most ${maxSetsPerExercise} sets per exercise.`);

    // Rows with nothing typed are sets the user did not do. Skip them.
    const filled = entry.sets
      .map((set, index) => ({ ...set, row: index + 1 }))
      .filter((set) => !isBlank(set.amount) || !isBlank(set.weight));
    if (filled.length === 0) continue;

    const exercise = allowedExercises(template, day, entry.slotKey, rules.savedExercises.get(entry.slotKey))
      .find((item) => item.key === entry.exerciseKey);
    if (!exercise) return failure("Choose an exercise from the list.");
    if (usedExercises.has(exercise.key)) return failure(`${exercise.name} is logged twice. Choose a different exercise.`);
    usedExercises.add(exercise.key);

    for (const [index, set] of filled.entries()) {
      const label = `${exercise.name}, set ${set.row}`;
      if (isBlank(set.amount)) return failure(`${label}: Enter ${exercise.measure === "seconds" ? "seconds" : "reps"}.`);
      const amount = parseAmount(set.amount.trim(), exercise.measure, label);
      if (!amount.ok) return amount;

      let weightKg: number | null = null;
      if (!isBlank(set.weight)) {
        if (!exercise.loaded) return failure(`${label}: This exercise does not take a weight.`);
        const weight = parseWeight(set.weight.trim(), rules.units, label);
        if (!weight.ok) return weight;
        weightKg = weight.data;
      }

      sets.push({
        slot_key: entry.slotKey,
        exercise_key: exercise.key,
        set_number: index + 1,
        reps: exercise.measure === "reps" ? amount.data : null,
        seconds: exercise.measure === "seconds" ? amount.data : null,
        weight_kg: weightKg,
      });
    }
  }

  if (sets.length === 0) return failure("Enter at least one set.");

  return {
    ok: true,
    data: { log_id: logId, template_key: template.key, day_key: day.key, performed_on: input.date, sets },
  };
}
