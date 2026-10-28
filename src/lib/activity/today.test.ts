import { describe, expect, it } from "vitest";
import { burnedToday } from "./burn";
import { restingProfile, todayBurnInput } from "./today";

const profile = { age_years: 30, height_cm: "180.00", sex_formula_branch: "male" };

describe("restingProfile", () => {
  it("reads numeric strings and keeps only a known sex", () => {
    expect(restingProfile(profile)).toEqual({ age_years: 30, height_cm: 180, sex_formula_branch: "male" });
    expect(restingProfile({ ...profile, sex_formula_branch: "other" }).sex_formula_branch).toBeNull();
  });

  it("gives empty details for a missing profile row", () => {
    expect(restingProfile(null)).toEqual({ age_years: null, height_cm: null, sex_formula_branch: null });
  });
});

describe("todayBurnInput", () => {
  const rows = {
    profile,
    weightKg: "80.00",
    workouts: [
      { duration_min: 60, set_count: 0 },
      { duration_min: null, set_count: 12 },
    ],
    daily: { steps: 10000, sleep_minutes: 450 },
    activities: [{ activity_key: "running", minutes: 30 }],
  };

  it("maps the rows into the card's input", () => {
    expect(todayBurnInput(rows)).toEqual({
      hasDetails: true,
      // 10 × 80 + 6.25 × 180 − 5 × 30 + 5 = 1780
      restingPerDay: 1780,
      weightKg: 80,
      workouts: [
        { duration_min: 60, set_count: 0 },
        { duration_min: null, set_count: 12 },
      ],
      steps: 10000,
      activities: [{ activity_key: "running", minutes: 30 }],
    });
  });

  it("gives the same numbers as burnedToday's own example at noon", () => {
    const result = burnedToday({ ...todayBurnInput(rows), minutesSinceMidnight: 720 });
    expect(result).toEqual({ resting: 890, workouts: 320, steps: 320, other: 280, total: 1810, endOfDay: 2700 });
  });

  it("has no resting burn and asks for details when height, age or sex is missing", () => {
    const input = todayBurnInput({ ...rows, profile: { age_years: null, height_cm: null, sex_formula_branch: null } });
    expect(input.hasDetails).toBe(false);
    expect(input.restingPerDay).toBeNull();
    expect(burnedToday({ ...input, minutesSinceMidnight: 720 }).total).toBe(920);
  });

  it("has details but no resting burn without a weigh-in", () => {
    const input = todayBurnInput({ ...rows, weightKg: null });
    expect(input.hasDetails).toBe(true);
    expect(input.restingPerDay).toBeNull();
    expect(input.weightKg).toBeNull();
    expect(burnedToday({ ...input, minutesSinceMidnight: 720 }).total).toBeNull();
  });

  it("treats no saved day as no steps", () => {
    expect(todayBurnInput({ ...rows, daily: null }).steps).toBeNull();
    expect(todayBurnInput({ ...rows, daily: { steps: null, sleep_minutes: 450 } }).steps).toBeNull();
  });
});
