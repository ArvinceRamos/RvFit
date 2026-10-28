import { isUuid } from "@/lib/meal";
import type { PreferredUnits } from "@/lib/weigh-in";
import { maxSetsPerExercise, type LogSlot, type SetFields } from "@/lib/workouts/log";

// Unsaved workout log forms, kept in the browser so a reload or a closed tab does not lose typed sets.
// One storage entry holds every draft, so logout clears them all with one key.
export const WORKOUT_DRAFTS_STORAGE_KEY = "rvfit-workout-drafts";

export type WorkoutDraft = {
  date: string;
  units: PreferredUnits;
  entries: Record<string, { exerciseKey: string; sets: SetFields[] }>;
  // The Duration (minutes) text. Drafts saved before the field existed have none.
  duration?: string;
  // A new workout's save key, kept once Save was pressed, so a retry after a reload is not saved twice.
  saveKey?: string;
};

// New logs keep one draft per plan day; edits keep one per saved log.
export function workoutDraftKey(logId: string | null, templateKey: string, dayKey: string): string {
  return logId ? `edit:${logId}` : `new:${templateKey}:${dayKey}`;
}

function readAll(storage: Storage): Record<string, unknown> {
  const raw = storage.getItem(WORKOUT_DRAFTS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function isSet(value: unknown): value is SetFields {
  const set = value as Record<string, unknown> | null;
  return typeof set === "object" && set !== null && typeof set.amount === "string" && typeof set.weight === "string";
}

/** The stored draft, or null when there is none or it no longer fits this form's slots and exercises. */
export function parseWorkoutDraft(value: unknown, slots: LogSlot[]): WorkoutDraft | null {
  const draft = value as Record<string, unknown> | null;
  if (typeof draft !== "object" || draft === null) return null;
  if (typeof draft.date !== "string") return null;
  if (draft.units !== "metric" && draft.units !== "imperial") return null;
  const rawEntries = draft.entries as Record<string, unknown> | null;
  if (typeof rawEntries !== "object" || rawEntries === null) return null;

  const entries: WorkoutDraft["entries"] = {};
  for (const slot of slots) {
    const entry = rawEntries[slot.slotKey] as Record<string, unknown> | undefined;
    if (typeof entry !== "object" || entry === null) return null;
    if (typeof entry.exerciseKey !== "string" || !slot.choices.some((choice) => choice.key === entry.exerciseKey)) return null;
    const sets = entry.sets;
    if (!Array.isArray(sets) || sets.length === 0 || sets.length > maxSetsPerExercise || !sets.every(isSet)) return null;
    entries[slot.slotKey] = { exerciseKey: entry.exerciseKey, sets: sets.map((set) => ({ amount: set.amount, weight: set.weight })) };
  }
  return {
    date: draft.date,
    units: draft.units,
    entries,
    ...(typeof draft.duration === "string" ? { duration: draft.duration } : {}),
    ...(isUuid(draft.saveKey) ? { saveKey: draft.saveKey } : {}),
  };
}

export function readWorkoutDraft(storage: Storage, key: string, slots: LogSlot[]): WorkoutDraft | null {
  return parseWorkoutDraft(readAll(storage)[key], slots);
}

export function writeWorkoutDraft(storage: Storage, key: string, draft: WorkoutDraft): void {
  storage.setItem(WORKOUT_DRAFTS_STORAGE_KEY, JSON.stringify({ ...readAll(storage), [key]: draft }));
}

export function clearWorkoutDraft(storage: Storage, key: string): void {
  const { [key]: removed, ...rest } = readAll(storage);
  if (removed === undefined) return;
  if (Object.keys(rest).length === 0) storage.removeItem(WORKOUT_DRAFTS_STORAGE_KEY);
  else storage.setItem(WORKOUT_DRAFTS_STORAGE_KEY, JSON.stringify(rest));
}
