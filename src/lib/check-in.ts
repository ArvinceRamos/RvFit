import { calculationConfig, type FormulaBranch } from "@/lib/calc/config";

// Target check-in: compares the weight trend with the pace the user chose and, when they clearly
// differ, suggests a small calorie change. It is advice only. It never changes a target, never
// suggests going below the calorie floor, and says nothing until there is enough data.
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
  | { status: "not_enough_data"; availableFrom: number | null; thisWeek: number; earlierWeek: number }
  | { status: "on_track"; observedKgPerWeek: number; expectedKgPerWeek: number }
  | { status: "adjust"; observedKgPerWeek: number; expectedKgPerWeek: number; changeKcal: number; suggestedKcal: number }
  | { status: "at_floor"; observedKgPerWeek: number; expectedKgPerWeek: number; floorKcal: number };

const rules = calculationConfig.check_in;
const dayMs = 24 * 60 * 60 * 1000;

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

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function targetCheckIn(input: CheckInInput): CheckIn {
  if (!input.goal) return { status: "no_goal" };

  const windowMs = rules.window_days * dayMs;
  const gapMs = rules.compare_gap_days * dayMs;
  const valid = input.weighIns.filter((point) => Number.isFinite(point.time) && Number.isFinite(point.kg) && point.time >= input.targetSetAt);
  const thisWeek = valid.filter((point) => point.time > input.now - windowMs && point.time <= input.now);
  const earlierWeek = valid.filter((point) => point.time > input.now - gapMs - windowMs && point.time <= input.now - gapMs);

  // Two weeks with enough weigh-ins, two weeks apart, both after the target was set.
  if (thisWeek.length < rules.min_weigh_ins_per_window || earlierWeek.length < rules.min_weigh_ins_per_window) {
    const earliest = input.targetSetAt + gapMs + windowMs;
    return {
      status: "not_enough_data",
      availableFrom: earliest > input.now ? earliest : null,
      thisWeek: thisWeek.length,
      earlierWeek: earlierWeek.length,
    };
  }

  const weeksApart = rules.compare_gap_days / 7;
  const observed = (average(thisWeek.map((p) => p.kg)) - average(earlierWeek.map((p) => p.kg))) / weeksApart;
  const expected = expectedKgPerWeek(input.goal, input.pace);
  const difference = observed - expected;
  if (Math.abs(difference) <= rules.on_track_tolerance_kg_per_week) {
    return { status: "on_track", observedKgPerWeek: observed, expectedKgPerWeek: expected };
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
