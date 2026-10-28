import { basalMetabolicRate } from "@/lib/calc/calculate";
import { calculationConfig, type FormulaBranch, type OtherActivityKey } from "@/lib/calc/config";

// Rough calories-burned estimates (docs/ACTIVITY.md "The math"). For information only: they never change
// the calorie target, the "left" numbers, the check-in or the meal planner. Every number comes from
// calculationConfig.activity (placeholders pending qualified review). Kept free of Next and the DOM so it can be tested.

const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;

export type RestingProfile = {
  age_years?: number | null;
  height_cm?: number | null;
  sex_formula_branch?: FormulaBranch | null;
};

export type WorkoutBurnInput = { duration_min: number | null; set_count: number };
export type ActivityBurnInput = { activity_key: string; minutes: number };

export type BurnedTodayInput = {
  /** From restingPerDay; null when height, age, sex or weight is missing. */
  restingPerDay: number | null;
  minutesSinceMidnight: number;
  /** The latest weigh-in; null when there is none. */
  weightKg: number | null;
  workouts: WorkoutBurnInput[];
  steps: number | null;
  activities: ActivityBurnInput[];
};

export type BurnedToday = {
  /** Resting burn so far; null when the profile details or the weight are missing. */
  resting: number | null;
  /** The activity parts are null when there is no weight. */
  workouts: number | null;
  steps: number | null;
  other: number | null;
  /** The sum of the known parts; null when no part is known. */
  total: number | null;
  /** The full day's resting burn plus the activity so far; null when resting is unknown. */
  endOfDay: number | null;
};

function positiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

// Not-a-number and negative results become 0. Valid inputs never give them.
function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function netKcal(met: number, weightKg: number, hours: number): number {
  return nonNegative((met - 1) * weightKg * hours);
}

// Full-day resting burn: Mifflin–St Jeor BMR from the calorie module, no activity multiplier.
// Null when height, age, sex or weight is missing (for example a manual-target user).
export function restingPerDay(profile: RestingProfile, weightKg: number | null): number | null {
  const { age_years, height_cm, sex_formula_branch } = profile;
  if (!positiveFinite(age_years) || !positiveFinite(height_cm) || !positiveFinite(weightKg)) return null;
  if (sex_formula_branch !== "male" && sex_formula_branch !== "female") return null;
  return nonNegative(basalMetabolicRate({ age_years, height_cm, weight_kg: weightKg }, sex_formula_branch));
}

// The share of the day's resting burn up to now: per day × minutes ÷ 1440, kept within 0..per day.
export function restingSoFar(perDay: number, minutesSinceMidnight: number): number {
  const day = nonNegative(perDay);
  const minutes = Math.min(Math.max(Number.isFinite(minutesSinceMidnight) ? minutesSinceMidnight : 0, 0), MINUTES_PER_DAY);
  return Math.min(day * (minutes / MINUTES_PER_DAY), day);
}

// (strength MET − 1) × kg × hours. Hours come from the duration, or from sets × minutes per set without one.
export function workoutKcal(weightKg: number, durationMin: number | null, setCount: number): number {
  const minutes = durationMin === null ? setCount * calculationConfig.activity.minutes_per_set : durationMin;
  return netKcal(calculationConfig.activity.strength_met, weightKg, nonNegative(minutes) / MINUTES_PER_HOUR);
}

// Steps × kg × kcal per step per kg (already net of resting).
export function stepsKcal(steps: number, weightKg: number): number {
  return nonNegative(steps * weightKg * calculationConfig.activity.kcal_per_step_per_kg);
}

export function findOtherActivity(key: string) {
  return calculationConfig.activity.other_activities.find((activity) => activity.key === key) ?? null;
}

export function isOtherActivityKey(key: string): key is OtherActivityKey {
  return findOtherActivity(key) !== null;
}

// (activity MET − 1) × kg × hours. An unknown key gives 0 rather than an error, so an old saved row whose key
// later leaves the config list cannot break the Today page. Saving checks the key first (validateActivityKey).
export function otherActivityKcal(key: string, minutes: number, weightKg: number): number {
  const activity = findOtherActivity(key);
  if (!activity) return 0;
  return netKcal(activity.met, weightKg, nonNegative(minutes) / MINUTES_PER_HOUR);
}

// Whole minutes since local midnight from the browser's clock. On a daylight-saving day this is clock time,
// so it can run to 1439 on a 23- or 25-hour day; restingSoFar keeps it in range.
export function minutesSinceLocalMidnight(date: Date): number {
  return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
}

// The Burned today card's numbers, each rounded to whole kcal. The total and end-of-day add the rounded
// parts, so the breakdown always adds up to what is shown.
export function burnedToday(input: BurnedTodayInput): BurnedToday {
  const perDay = positiveFinite(input.restingPerDay) ? Math.round(input.restingPerDay) : null;
  const resting = perDay === null ? null : Math.round(restingSoFar(perDay, input.minutesSinceMidnight));

  const weight = positiveFinite(input.weightKg) ? input.weightKg : null;
  const workouts =
    weight === null
      ? null
      : Math.round(input.workouts.reduce((sum, workout) => sum + workoutKcal(weight, workout.duration_min, workout.set_count), 0));
  const steps = weight === null ? null : Math.round(input.steps === null ? 0 : stepsKcal(input.steps, weight));
  const other =
    weight === null
      ? null
      : Math.round(input.activities.reduce((sum, activity) => sum + otherActivityKcal(activity.activity_key, activity.minutes, weight), 0));

  const activity = weight === null ? 0 : (workouts ?? 0) + (steps ?? 0) + (other ?? 0);
  const total = resting === null && weight === null ? null : (resting ?? 0) + activity;
  const endOfDay = perDay === null ? null : perDay + activity;
  return { resting, workouts, steps, other, total, endOfDay };
}
