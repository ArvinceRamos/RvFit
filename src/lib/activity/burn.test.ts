import { describe, expect, it } from "vitest";
import { calculateTarget } from "@/lib/calc/calculate";
import { calculationConfig } from "@/lib/calc/config";
import {
  burnedToday,
  findOtherActivity,
  minutesSinceLocalMidnight,
  otherActivityKcal,
  restingPerDay,
  restingSoFar,
  stepsKcal,
  workoutKcal,
  type BurnedTodayInput,
} from "./burn";

const male = { age_years: 30, height_cm: 180, sex_formula_branch: "male" as const };

describe("activity placeholders", () => {
  it("match docs/ACTIVITY.md", () => {
    const activity = calculationConfig.activity;
    expect(activity.strength_met).toBe(3.5);
    expect(activity.minutes_per_set).toBe(3);
    expect(activity.kcal_per_step_per_kg).toBe(0.0004);
    expect(activity.other_activities.map(({ key, label, met }) => [key, label, met])).toEqual([
      ["cycling", "Cycling", 6.8],
      ["running", "Running", 8.0],
      ["swimming", "Swimming", 6.0],
      ["sports", "Team sports", 7.0],
      ["dancing", "Dancing", 5.0],
      ["other_cardio", "Other cardio", 5.0],
    ]);
  });

  it("offers no walking option, because steps count walking", () => {
    const keys = calculationConfig.activity.other_activities.map((activity) => activity.key as string);
    const labels = calculationConfig.activity.other_activities.map((activity) => activity.label.toLowerCase());
    expect(keys).not.toContain("walking");
    expect(labels.some((label) => label.includes("walk"))).toBe(false);
    expect(findOtherActivity("walking")).toBeNull();
    expect(otherActivityKcal("walking", 60, 80)).toBe(0);
  });
});

describe("restingPerDay", () => {
  it("is the Mifflin–St Jeor BMR with no activity multiplier", () => {
    // 10 × 80 + 6.25 × 180 − 5 × 30 + 5 = 1780
    expect(restingPerDay(male, 80)).toBe(1780);
    // 10 × 80 + 6.25 × 180 − 5 × 30 − 161 = 1614
    expect(restingPerDay({ ...male, sex_formula_branch: "female" }, 80)).toBe(1614);
  });

  it("matches the calorie module's sedentary maintenance divided by 1.2", () => {
    const target = calculateTarget({
      age_years: 30,
      height: { unit: "cm", value: 180 },
      weight: { unit: "kg", value: 80 },
      sex: "male",
      activity_level: "sedentary",
      goal: "maintain",
    });
    expect(target.ok && target.data.maintenance_kcal).toBe(Math.round(1780 * 1.2));
  });

  it("is null when height, age, sex or weight is missing", () => {
    expect(restingPerDay({ ...male, height_cm: null }, 80)).toBeNull();
    expect(restingPerDay({ ...male, age_years: undefined }, 80)).toBeNull();
    expect(restingPerDay({ ...male, sex_formula_branch: null }, 80)).toBeNull();
    expect(restingPerDay({}, 80)).toBeNull();
    expect(restingPerDay(male, null)).toBeNull();
    expect(restingPerDay(male, 0)).toBeNull();
    expect(restingPerDay(male, Number.NaN)).toBeNull();
  });
});

describe("restingSoFar", () => {
  it("is per day × minutes ÷ 1440", () => {
    expect(restingSoFar(1780, 720)).toBe(890);
    expect(restingSoFar(1440, 360)).toBe(360);
    expect(restingSoFar(1780, 0)).toBe(0);
    expect(restingSoFar(1780, 1440)).toBe(1780);
  });

  it("stays within 0 and the day's total", () => {
    expect(restingSoFar(1780, -10)).toBe(0);
    expect(restingSoFar(1780, 1500)).toBe(1780);
    expect(restingSoFar(1780, Number.NaN)).toBe(0);
    expect(restingSoFar(-100, 720)).toBe(0);
  });
});

describe("workoutKcal", () => {
  it("uses the duration: (3.5 − 1) × kg × hours", () => {
    expect(workoutKcal(80, 60, 0)).toBeCloseTo(200, 10);
    expect(workoutKcal(80, 30, 12)).toBeCloseTo(100, 10);
  });

  it("uses sets × 3 minutes when there is no duration", () => {
    // 12 sets × 3 min = 36 min = 0.6 h; 2.5 × 80 × 0.6 = 120
    expect(workoutKcal(80, null, 12)).toBeCloseTo(120, 10);
    expect(workoutKcal(80, null, 0)).toBe(0);
  });

  it("never goes below 0", () => {
    expect(workoutKcal(80, -30, 0)).toBe(0);
    expect(workoutKcal(-80, 60, 0)).toBe(0);
    expect(workoutKcal(80, Number.NaN, 0)).toBe(0);
  });
});

describe("stepsKcal", () => {
  it("is steps × kg × 0.0004", () => {
    expect(stepsKcal(10000, 80)).toBeCloseTo(320, 10);
    expect(stepsKcal(0, 80)).toBe(0);
  });

  it("never goes below 0", () => {
    expect(stepsKcal(-100, 80)).toBe(0);
  });
});

describe("otherActivityKcal", () => {
  it("is (MET − 1) × kg × hours with the MET from the list", () => {
    // Running: 7.0 × 80 × 0.5 = 280
    expect(otherActivityKcal("running", 30, 80)).toBeCloseTo(280, 10);
    // Cycling: 5.8 × 70 × 0.75 = 304.5
    expect(otherActivityKcal("cycling", 45, 70)).toBeCloseTo(304.5, 10);
    // Team sports: 6.0 × 60 × 1 = 360
    expect(otherActivityKcal("sports", 60, 60)).toBeCloseTo(360, 10);
  });

  it("gives 0 for an unknown key or negative minutes", () => {
    expect(otherActivityKcal("rowing", 30, 80)).toBe(0);
    expect(otherActivityKcal("running", -30, 80)).toBe(0);
  });
});

describe("minutesSinceLocalMidnight", () => {
  it("counts whole local minutes", () => {
    expect(minutesSinceLocalMidnight(new Date(2026, 9, 28, 0, 0, 0))).toBe(0);
    expect(minutesSinceLocalMidnight(new Date(2026, 9, 28, 13, 45, 30))).toBe(825);
    expect(minutesSinceLocalMidnight(new Date(2026, 9, 28, 23, 59, 59))).toBe(1439);
  });
});

describe("burnedToday", () => {
  const full: BurnedTodayInput = {
    restingPerDay: 1780,
    minutesSinceMidnight: 720,
    weightKg: 80,
    workouts: [
      { duration_min: 60, set_count: 0 },
      { duration_min: null, set_count: 12 },
    ],
    steps: 10000,
    activities: [{ activity_key: "running", minutes: 30 }],
  };

  it("adds the parts and the full day's resting burn", () => {
    // Resting 890; workouts 200 + 120; steps 320; other 280.
    expect(burnedToday(full)).toEqual({
      resting: 890,
      workouts: 320,
      steps: 320,
      other: 280,
      total: 1810,
      endOfDay: 2700,
    });
  });

  it("gives 0 activity parts when nothing is logged", () => {
    expect(burnedToday({ ...full, workouts: [], steps: null, activities: [] })).toEqual({
      resting: 890,
      workouts: 0,
      steps: 0,
      other: 0,
      total: 890,
      endOfDay: 1780,
    });
  });

  it("rounds each part to whole kcal, and the totals add the rounded parts", () => {
    const result = burnedToday({
      restingPerDay: 1780.4,
      minutesSinceMidnight: 1,
      weightKg: 80.5,
      workouts: [{ duration_min: 7, set_count: 0 }],
      steps: 1234,
      activities: [{ activity_key: "dancing", minutes: 1 }],
    });
    // Resting 1780 ÷ 1440 = 1.24 → 1; workout 2.5 × 80.5 × 7/60 = 23.48 → 23;
    // steps 1234 × 80.5 × 0.0004 = 39.74 → 40; dancing 4 × 80.5 / 60 = 5.37 → 5.
    expect(result).toEqual({ resting: 1, workouts: 23, steps: 40, other: 5, total: 69, endOfDay: 1848 });
  });

  it("shows only the activity parts when height, age or sex is missing", () => {
    expect(burnedToday({ ...full, restingPerDay: null })).toEqual({
      resting: null,
      workouts: 320,
      steps: 320,
      other: 280,
      total: 920,
      endOfDay: null,
    });
  });

  it("has no estimates without a weight", () => {
    expect(burnedToday({ ...full, restingPerDay: restingPerDay(male, null), weightKg: null })).toEqual({
      resting: null,
      workouts: null,
      steps: null,
      other: null,
      total: null,
      endOfDay: null,
    });
  });

  it("clamps out-of-range values to 0", () => {
    const result = burnedToday({
      restingPerDay: 1780,
      minutesSinceMidnight: -5,
      weightKg: 80,
      workouts: [{ duration_min: -60, set_count: 0 }],
      steps: -500,
      activities: [{ activity_key: "running", minutes: -30 }],
    });
    expect(result).toEqual({ resting: 0, workouts: 0, steps: 0, other: 0, total: 0, endOfDay: 1780 });
  });

  it("does not count resting past the end of the day", () => {
    expect(burnedToday({ ...full, minutesSinceMidnight: 2000 }).resting).toBe(1780);
  });
});
