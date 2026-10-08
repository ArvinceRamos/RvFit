import { calculationConfig } from "@/lib/calc/config";
import type { PreferredUnits } from "@/lib/weigh-in";
import { formatCalendarDate } from "./format";
import { formatWeight, weightUnit, type LogChoice } from "./log";

const limits = calculationConfig.workouts;
const lowerBodyPatterns: readonly string[] = ["squat", "hinge", "single_leg"];

export type LastSet = { setNumber: number; reps: number | null; seconds: number | null; weightKg: number | null };
export type LastSession = { performedOn: string; sets: readonly LastSet[] };

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

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

// The next weight, in the user's units. The base is the lowest weight across the planned sets,
// so an extra heavy (or light) set never drives the suggestion. Light loads use a smaller step,
// and the result is rounded to a weight people can actually load (0.5 kg or 2.5 lb).
function nextWeight(baseKg: number, lowerBody: boolean, units: PreferredUnits): number {
  const size = baseKg < limits.small_load_kg ? "small" : lowerBody ? "lower" : "upper";
  const base = units === "metric" ? baseKg : baseKg / calculationConfig.unit_conversions.pounds_to_kilograms;
  const step = units === "metric" ? limits.weight_step_kg[size] : limits.weight_step_lb[size];
  const rounding = units === "metric" ? limits.weight_rounding.kg : limits.weight_rounding.lb;
  let target = roundTo(base + step, rounding);
  if (target <= base) target += rounding;
  return Math.round(target * 10) / 10;
}

const harderOption = "Optional: try a harder exercise with Swap on the Workouts page.";

/**
 * An optional suggestion, or null. It never changes a plan or a log.
 * It shows only when the last session has at least the planned number of sets and each
 * planned set reached the top of the range. Only the planned sets are used.
 */
export function progressionPrompt(
  last: LastSession,
  choice: Pick<LogChoice, "measure" | "loaded" | "pattern" | "topOfRange">,
  plannedSets: number,
  units: PreferredUnits,
): string | null {
  if (plannedSets < 1 || last.sets.length < plannedSets) return null;
  const planned = last.sets.slice(0, plannedSets);
  if (planned.some((set) => amountOf(set) < choice.topOfRange)) return null;

  const earned = "You reached the top of the range on every set last time.";
  if (choice.loaded) {
    // Every planned set needs a weight, or there is nothing safe to build on.
    if (planned.some((set) => set.weightKg === null || set.weightKg <= 0)) return null;
    const base = Math.min(...planned.map((set) => set.weightKg as number));
    const target = nextWeight(base, lowerBodyPatterns.includes(choice.pattern), units);
    return `${earned} Optional: try ${target} ${weightUnit(units)} and start again at the bottom of the rep range.`;
  }
  const lowest = Math.min(...planned.map(amountOf));
  if (choice.measure === "seconds") {
    if (lowest >= limits.max_prompt_seconds_hold) return `${earned} ${harderOption}`;
    return `${earned} Optional: hold ${Math.min(lowest + limits.extra_seconds_hold, limits.max_prompt_seconds_hold)} seconds per set.`;
  }
  if (lowest >= limits.max_prompt_reps_unloaded) return `${earned} ${harderOption}`;
  return `${earned} Optional: aim for ${Math.min(lowest + limits.extra_reps_unloaded, limits.max_prompt_reps_unloaded)} reps per set.`;
}
