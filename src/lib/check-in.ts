import { calculationConfig, type FormulaBranch } from "@/lib/calc/config";

// Target check-in: compares the weight trend with the pace the user chose and, when they clearly
// differ, suggests a small calorie change. It is advice only. It never changes a target, never
// suggests going below the calorie floor, and says nothing until there is enough data. The trend is a
// straight-line fit over the latest weigh-ins, and it holds instead of suggesting when the weigh-ins are too noisy.
// Values live in calculationConfig.check_in and are placeholders pending qualified review.

export type CheckInGoal = "lose" | "maintain" | "gain";
export type CheckInPace = "gradual" | "steady";

export type CheckInInput = {
  /** The current target. */
  targetKcal: number;
  /** When the current target was saved. Only weigh-ins after this count. */
  targetSetAt: number;
  /** Goal and pace from the latest calculated target (a manual target keeps the earlier goal). */
  goal: CheckInGoal | null;
  pace: CheckInPace | null;
  /** True when the current target is at the formula floor. */
  floorApplied: boolean;
  /** Formula branch for the floor; null uses the lowest floor. */
  branch: FormulaBranch | null;
  weighIns: readonly { time: number; kg: number }[];
  now: number;
};

export type CheckIn =
  | { status: "no_goal" }
  | { status: "not_enough_data"; availableFrom: number | null; weighInDays: number; spanDays: number }
  // The trend is off the pace, but the weigh-ins vary too much to be sure, so no change is suggested yet.
  | { status: "holding"; observedKgPerWeek: number; expectedKgPerWeek: number }
  | { status: "on_track"; observedKgPerWeek: number; expectedKgPerWeek: number }
  | { status: "adjust"; observedKgPerWeek: number; expectedKgPerWeek: number; changeKcal: number; suggestedKcal: number }
  | { status: "at_floor"; observedKgPerWeek: number; expectedKgPerWeek: number; floorKcal: number };

const rules = calculationConfig.check_in;
const dayMs = 24 * 60 * 60 * 1000;

/** How many days of weigh-ins a check-in reads. Pages load this much history. */
export const checkInHistoryDays = rules.window_days;

/** True when the check-in has a result to show: not waiting for data and not without a goal. */
export function checkInReady(checkIn: CheckIn): boolean {
  return checkIn.status !== "no_goal" && checkIn.status !== "not_enough_data";
}

/** The weekly change the chosen pace aims for, in kg (negative = loss). A rough estimate. */
export function expectedKgPerWeek(goal: CheckInGoal, pace: CheckInPace | null): number {
  const { loss_paces_kcal, gain_paces_kcal } = calculationConfig.goal_adjustments;
  if (goal === "maintain" || !pace) return 0;
  const dailyKcal = goal === "lose" ? -loss_paces_kcal[pace] : gain_paces_kcal[pace];
  return (dailyKcal * 7) / rules.kcal_per_kg;
}

function floorFor(branch: FormulaBranch | null): number {
  const floors = calculationConfig.formula_branch_floors_kcal;
  return branch ? floors[branch] : Math.min(...Object.values(floors));
}

// Straight-line fit of weight over time, in kg a week, with its standard error. Needs 3+ points at 2+ times.
export function trendSlope(points: readonly { time: number; kg: number }[]): { kgPerWeek: number; standardError: number } {
  const weekMs = 7 * dayMs;
  const n = points.length;
  const meanTime = points.reduce((sum, p) => sum + p.time, 0) / n;
  const meanKg = points.reduce((sum, p) => sum + p.kg, 0) / n;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    const x = (p.time - meanTime) / weekMs;
    sxx += x * x;
    sxy += x * (p.kg - meanKg);
  }
  const slope = sxy / sxx;
  let residuals = 0;
  for (const p of points) {
    const fitted = meanKg + slope * ((p.time - meanTime) / weekMs);
    residuals += (p.kg - fitted) ** 2;
  }
  return { kgPerWeek: slope, standardError: Math.sqrt(residuals / (n - 2) / sxx) };
}

export function targetCheckIn(input: CheckInInput): CheckIn {
  if (!input.goal) return { status: "no_goal" };

  // Skip the first days after a new target, then read the latest window.
  const usableFrom = Math.max(input.targetSetAt + rules.settle_days * dayMs, input.now - rules.window_days * dayMs);
  const points = input.weighIns.filter(
    (point) => Number.isFinite(point.time) && Number.isFinite(point.kg) && point.time >= usableFrom && point.time <= input.now,
  );
  // Days count from now, so several weigh-ins on one day count once.
  const weighInDays = new Set(points.map((point) => Math.floor((input.now - point.time) / dayMs))).size;
  const times = points.map((point) => point.time);
  const spanDays = points.length > 0 ? (Math.max(...times) - Math.min(...times)) / dayMs : 0;

  if (weighInDays < rules.min_weigh_in_days || spanDays < rules.min_span_days) {
    const earliest = input.targetSetAt + (rules.settle_days + rules.min_span_days) * dayMs;
    return {
      status: "not_enough_data",
      availableFrom: earliest > input.now ? earliest : null,
      weighInDays,
      spanDays: Math.floor(spanDays),
    };
  }

  const trend = trendSlope(points);
  const observed = trend.kgPerWeek;
  const expected = expectedKgPerWeek(input.goal, input.pace);
  const difference = observed - expected;
  if (Math.abs(difference) <= rules.on_track_tolerance_kg_per_week) {
    return { status: "on_track", observedKgPerWeek: observed, expectedKgPerWeek: expected };
  }
  // Off the pace, but within the noise of the weigh-ins: wait for a clearer trend.
  if (Math.abs(difference) < rules.clear_trend_std_errors * trend.standardError) {
    return { status: "holding", observedKgPerWeek: observed, expectedKgPerWeek: expected };
  }

  // Gaining faster (or losing slower) than planned means eating a little less, and the other way round.
  const { min, max, step } = rules.change_kcal;
  const raw = (-difference * rules.kcal_per_kg) / 7;
  const size = Math.min(max, Math.max(min, Math.round(Math.abs(raw) / step) * step));
  let changeKcal = Math.sign(raw) * size;

  const floor = floorFor(input.branch);
  if (changeKcal < 0) {
    if (input.floorApplied || input.targetKcal <= floor) {
      return { status: "at_floor", observedKgPerWeek: observed, expectedKgPerWeek: expected, floorKcal: floor };
    }
    changeKcal = Math.max(changeKcal, floor - input.targetKcal);
  }
  // A round number is easier to aim for; the floor still wins over rounding.
  const suggestedKcal = Math.max(Math.round((input.targetKcal + changeKcal) / step) * step, changeKcal < 0 ? floor : 0);
  return {
    status: "adjust",
    observedKgPerWeek: observed,
    expectedKgPerWeek: expected,
    changeKcal: suggestedKcal - input.targetKcal,
    suggestedKcal,
  };
}
