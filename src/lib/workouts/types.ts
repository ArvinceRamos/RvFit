import type { Equipment, Experience } from "@/lib/preferences";

export const movementPatterns = [
  "squat",
  "hinge",
  "single_leg",
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "side_delt",
  "biceps",
  "triceps",
  "core",
  "calves",
] as const;

export type MovementPattern = (typeof movementPatterns)[number];
export type Measure = "reps" | "seconds";
export type Level = Experience;

export type Exercise = {
  /** Permanent kebab-case key. Never rename or reuse. */
  key: string;
  name: string;
  pattern: MovementPattern;
  /** Lowest equipment tier that can do it. */
  equipment: Equipment;
  measure: Measure;
  /** Uses added weight. */
  loaded: boolean;
  cue?: string;
  retired?: boolean;
};

/** For a seconds exercise the range is seconds. */
export type Scheme = {
  sets: number;
  reps: { min: number; max: number };
  restSeconds: number;
};

export type Slot = {
  /** Permanent. Built from the day key, the pattern, and the count of that pattern in the day. */
  key: string;
  pattern: MovementPattern;
  /** Index into the ordered exercise list for this pattern and equipment tier. */
  pick: number;
  /** A level with no scheme leaves the slot out. */
  beginner?: Scheme;
  intermediate?: Scheme;
};

export type SplitDay = { key: string; name: string; slots: Slot[] };

export type Split = {
  key: string;
  trainingDays: number;
  days: SplitDay[];
};
