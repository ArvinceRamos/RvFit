import { beforeEach, describe, expect, it } from "vitest";
import type { LogSlot } from "@/lib/workouts/log";
import {
  WORKOUT_DRAFTS_STORAGE_KEY,
  clearWorkoutDraft,
  parseWorkoutDraft,
  readWorkoutDraft,
  workoutDraftKey,
  writeWorkoutDraft,
  type WorkoutDraft,
} from "./workout-draft";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const choice = (key: string) => ({ key, label: key, measure: "reps" as const, loaded: true, pattern: "squat" as const, topOfRange: 10 });
const slots = [
  { slotKey: "a", plannedExerciseKey: "goblet_squat", plannedSets: 2, planText: "2 x 8-10", choices: [choice("goblet_squat"), choice("leg_press")] },
] as LogSlot[];
const draft: WorkoutDraft = {
  date: "2026-10-24",
  units: "metric",
  entries: { a: { exerciseKey: "leg_press", sets: [{ amount: "10", weight: "40" }, { amount: "", weight: "" }] } },
};

describe("workout drafts", () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("uses one key per plan day for new logs and one per saved log for edits", () => {
    expect(workoutDraftKey(null, "full_body", "a")).toBe("new:full_body:a");
    expect(workoutDraftKey("log-1", "full_body", "a")).toBe("edit:log-1");
  });

  it("writes, reads and clears a draft without touching other drafts", () => {
    writeWorkoutDraft(storage, "new:full_body:a", draft);
    writeWorkoutDraft(storage, "edit:log-1", { ...draft, date: "2026-10-20" });
    expect(readWorkoutDraft(storage, "new:full_body:a", slots)).toEqual(draft);

    clearWorkoutDraft(storage, "new:full_body:a");
    expect(readWorkoutDraft(storage, "new:full_body:a", slots)).toBeNull();
    expect(readWorkoutDraft(storage, "edit:log-1", slots)?.date).toBe("2026-10-20");

    clearWorkoutDraft(storage, "edit:log-1");
    expect(storage.getItem(WORKOUT_DRAFTS_STORAGE_KEY)).toBeNull();
  });

  it("keeps a valid save key and drops a malformed one", () => {
    const saveKey = "c0000000-0000-4000-8000-000000000001";
    writeWorkoutDraft(storage, "new:full_body:a", { ...draft, saveKey });
    expect(readWorkoutDraft(storage, "new:full_body:a", slots)).toEqual({ ...draft, saveKey });

    writeWorkoutDraft(storage, "new:full_body:a", { ...draft, saveKey: "not-a-uuid" });
    expect(readWorkoutDraft(storage, "new:full_body:a", slots)).toEqual(draft);
  });

  it("ignores broken storage", () => {
    storage.setItem(WORKOUT_DRAFTS_STORAGE_KEY, "{not json");
    expect(readWorkoutDraft(storage, "new:full_body:a", slots)).toBeNull();
    writeWorkoutDraft(storage, "new:full_body:a", draft);
    expect(readWorkoutDraft(storage, "new:full_body:a", slots)).toEqual(draft);
  });

  it("drops a draft that no longer fits the form", () => {
    expect(parseWorkoutDraft(draft, slots)).toEqual(draft);
    expect(parseWorkoutDraft({ ...draft, units: "stone" }, slots)).toBeNull();
    expect(parseWorkoutDraft({ ...draft, entries: {} }, slots)).toBeNull();
    expect(parseWorkoutDraft({ ...draft, entries: { a: { exerciseKey: "deadlift", sets: draft.entries.a.sets } } }, slots)).toBeNull();
    expect(parseWorkoutDraft({ ...draft, entries: { a: { exerciseKey: "leg_press", sets: [] } } }, slots)).toBeNull();
    expect(parseWorkoutDraft({ ...draft, entries: { a: { exerciseKey: "leg_press", sets: [{ amount: 10, weight: "" }] } } }, slots)).toBeNull();
    expect(parseWorkoutDraft(null, slots)).toBeNull();
  });
});
