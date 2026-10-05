import { calculationConfig } from "@/lib/calc/config";
import type { PreferredUnits } from "@/lib/weigh-in";
import { formatCalendarDate } from "./format";
import { formatWeight, weightUnit, type LogChoice } from "./log";

const limits = calculationConfig.workouts;
const lowerBodyPatterns: readonly string[] = ["squat", "hinge", "single_leg"];

export type LastSet = { setNumber: number; reps: number | null; seconds: number | null; weightKg: number | null };
export type LastSession = { performedOn: string; sets: LastSet[] };

// Rows as returned for earlier workouts, newest first, each holding only the sets we asked about.
export type EarlierLog = {
  performed_on: string;
  workout_log_sets: { exercise_key: string; set_number: number; reps: number | null; seconds: number | null; weight_kg: number | string | null }[];
};

/** For each exercise, the most recent earlier workout that contains it. `logs` must be newest first. */
export function pickLastSessions(logs: readonly EarlierLog[], exerciseKeys: readonly string[]): Record<string, LastSession> {
  const found: Record<string, LastSession> = {};
  for (const key of exerciseKeys) {
    const log = logs.find((item) => item.workout_log_sets.some((set) => set.exercise_key === key));
    if (!log) continue;
    found[key] = {
      performedOn: log.performed_on,
      sets: log.workout_log_sets
        .filter((set) => set.exercise_key === key)
        .map((set) => ({
          setNumber: set.set_number,
          reps: set.reps,
          seconds: set.seconds,
          weightKg: set.weight_kg === null ? null : Number(set.weight_kg),
        }))
        .sort((a, b) => a.setNumber - b.setNumber),
    };
  }
  return found;
}

function amountOf(set: LastSet): number {
  return set.reps ?? set.seconds ?? 0;
}

// Example: "Oct 5, 2026: 10 × 100 kg, 11 × 100 kg" or "Oct 5, 2026: 30 s, 30 s"
export function lastTimeText(last: LastSession, measure: LogChoice["measure"], units: PreferredUnits): string {
  const sets = last.sets.map((set) => {
    const amount = measure === "seconds" ? `${amountOf(set)} s` : `${amountOf(set)}`;
    return set.weightKg === null ? amount : `${amount} × ${formatWeight(set.weightKg, units)} ${weightUnit(units)}`;
  });
  return `${formatCalendarDate(last.performedOn)}: ${sets.join(", ")}`;
}

// Practical step: 0.5 kg, or 1 lb.
function roundWeight(weightKg: number, units: PreferredUnits): number {
  if (units === "metric") return Math.round(weightKg * 2) / 2;
  return Math.round(weightKg / calculationConfig.unit_conversions.pounds_to_kilograms);
}

/**
 * An optional suggestion, or null. It never changes a plan or a log.
 * It shows only when the last session has at least the planned number of sets and each
 * planned set reached the top of the range.
 */
export function progressionPrompt(
  last: LastSession,
  choice: Pick<LogChoice, "measure" | "loaded" | "pattern" | "topOfRange">,
  plannedSets: number,
  units: PreferredUnits,
): string | null {
  if (last.sets.length < plannedSets) return null;
  const planned = last.sets.slice(0, plannedSets);
  if (planned.some((set) => amountOf(set) < choice.topOfRange)) return null;

  const earned = "You reached the top of the range on every set last time. Optional:";
  if (choice.loaded) {
    const weights = last.sets.map((set) => set.weightKg).filter((weight): weight is number => weight !== null);
    if (weights.length === 0) return null;
    const step = lowerBodyPatterns.includes(choice.pattern) ? limits.weight_step_kg.lower : limits.weight_step_kg.upper;
    const target = roundWeight(Math.max(...weights) + step, units);
    return `${earned} try ${target} ${weightUnit(units)}.`;
  }
  const lowest = Math.min(...planned.map(amountOf));
  if (choice.measure === "seconds") return `${earned} hold ${lowest + limits.extra_seconds_hold} seconds per set.`;
  return `${earned} aim for ${lowest + limits.extra_reps_unloaded} reps per set.`;
}
