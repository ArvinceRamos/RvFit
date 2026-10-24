import { describe, expect, it } from "vitest";
import { expectedKgPerWeek, targetCheckIn, trendSlope, type CheckInInput } from "./check-in";

const day = 24 * 60 * 60 * 1000;
const now = 200 * day;

// One weigh-in a day for the last 21 days (20 days ago to today), on a straight line through startKg
// that changes by kgPerWeek. noise(i) adds a wobble to the i-th weigh-in.
function daily(startKg: number, kgPerWeek: number, noise: (i: number) => number = () => 0) {
  return Array.from({ length: 21 }, (_, i) => {
    const daysAgo = 20 - i;
    return { time: now - daysAgo * day, kg: startKg + (kgPerWeek * i) / 7 + noise(i) };
  });
}

function input(overrides: Partial<CheckInInput> = {}): CheckInInput {
  return {
    targetKcal: 2200,
    targetSetAt: now - 40 * day,
    goal: "lose",
    pace: "steady",
    floorApplied: false,
    branch: "male",
    weighIns: daily(90, -0.5),
    now,
    ...overrides,
  };
}

describe("expectedKgPerWeek", () => {
  it("turns the pace into a rough weekly change", () => {
    expect(expectedKgPerWeek("lose", "steady")).toBeCloseTo(-0.4545, 3); // 500 kcal x 7 / 7700
    expect(expectedKgPerWeek("lose", "gradual")).toBeCloseTo(-0.2273, 3);
    expect(expectedKgPerWeek("gain", "gradual")).toBeCloseTo(0.0909, 3);
    expect(expectedKgPerWeek("maintain", null)).toBe(0);
  });
});

describe("trendSlope", () => {
  it("fits a straight line in kg a week with no error on a clean line", () => {
    const fit = trendSlope(daily(90, -0.5));
    expect(fit.kgPerWeek).toBeCloseTo(-0.5, 6);
    expect(fit.standardError).toBeCloseTo(0, 6);
  });

  it("reports a larger error when weigh-ins bounce around", () => {
    const fit = trendSlope(daily(90, 0, (i) => (i % 2 === 0 ? 1 : -1)));
    expect(fit.standardError).toBeGreaterThan(0.1);
  });
});

describe("targetCheckIn", () => {
  it("says nothing without a goal (for example, only manual targets so far)", () => {
    expect(targetCheckIn(input({ goal: null, pace: null }))).toEqual({ status: "no_goal" });
  });

  it("skips the first 7 days after a new target and waits for 14 days of weigh-ins after that", () => {
    const fresh = targetCheckIn(input({ targetSetAt: now - 10 * day }));
    expect(fresh).toMatchObject({ status: "not_enough_data", availableFrom: now + 11 * day });
    // Set 20 days ago: weigh-ins from days 20-14 ago are skipped, leaving 13 days of span.
    const settling = targetCheckIn(input({ targetSetAt: now - 20 * day }));
    expect(settling).toMatchObject({ status: "not_enough_data", availableFrom: now + 1 * day, spanDays: 13 });
  });

  it("needs weigh-ins on enough different days", () => {
    // 7 days with a weigh-in, spread over 18 days.
    const sparse = daily(90, -0.5).filter((_, i) => i % 3 === 0);
    expect(targetCheckIn(input({ weighIns: sparse }))).toMatchObject({ status: "not_enough_data", availableFrom: null, weighInDays: 7 });
    // Several weigh-ins on one day count once.
    const sameDay = [...sparse, { time: now - 2 * day - 1000, kg: 87 }, { time: now - 2 * day - 2000, kg: 87 }];
    expect(targetCheckIn(input({ weighIns: sameDay }))).toMatchObject({ status: "not_enough_data", weighInDays: 7 });
  });

  it("is on track when the trend is close to the pace", () => {
    // -0.5 kg a week against about -0.45 expected.
    expect(targetCheckIn(input())).toMatchObject({ status: "on_track" });
  });

  it("holds instead of suggesting when the weigh-ins are too noisy to tell", () => {
    // Flat on a loss goal, but swinging 1.5 kg either way.
    const noisy = daily(90, 0, (i) => (i % 2 === 0 ? 1.5 : -1.5)).filter((_, i) => i % 2 === 0 || i % 5 === 0);
    expect(targetCheckIn(input({ weighIns: noisy }))).toMatchObject({ status: "holding" });
  });

  it("suggests eating a little less when weight is not moving on a loss goal", () => {
    const result = targetCheckIn(input({ weighIns: daily(90, 0) }));
    expect(result).toEqual(expect.objectContaining({ status: "adjust", changeKcal: -200, suggestedKcal: 2000 }));
  });

  it("suggests eating a little more when losing much faster than planned", () => {
    const result = targetCheckIn(input({ weighIns: daily(92, -1.5) }));
    expect(result).toEqual(expect.objectContaining({ status: "adjust", changeKcal: 200, suggestedKcal: 2400 }));
  });

  it("keeps changes between 100 and 200 kcal in 50 kcal steps", () => {
    // Maintain, drifting up 0.3 kg a week: about 330 kcal a day, capped at 200.
    const drifting = targetCheckIn(input({ goal: "maintain", pace: null, weighIns: daily(80, 0.3) }));
    expect(drifting).toMatchObject({ status: "adjust", changeKcal: -200 });
    // Maintain, drifting up 0.17 kg a week: about 190 kcal, rounded to 200.
    const small = targetCheckIn(input({ goal: "maintain", pace: null, weighIns: daily(80, 0.17) }));
    expect(small).toMatchObject({ status: "adjust", changeKcal: -200 });
  });

  it("rounds the suggested target to 50 kcal", () => {
    const result = targetCheckIn(input({ targetKcal: 2099, weighIns: daily(90, 0) }));
    expect(result).toMatchObject({ status: "adjust", suggestedKcal: 1900, changeKcal: -199 });
  });

  it("never suggests going below the calorie floor", () => {
    const atFloor = targetCheckIn(input({ targetKcal: 1500, floorApplied: true, weighIns: daily(90, 0) }));
    expect(atFloor).toMatchObject({ status: "at_floor", floorKcal: 1500 });
    const nearFloor = targetCheckIn(input({ targetKcal: 1550, weighIns: daily(90, 0) }));
    expect(nearFloor).toMatchObject({ status: "adjust", changeKcal: -50, suggestedKcal: 1500 });
  });

  it("ignores weigh-ins from before the target was set and outside the window", () => {
    const old = [{ time: now - 60 * day, kg: 100 }, { time: now - 30 * day, kg: 120 }, ...daily(90, -0.5)];
    expect(targetCheckIn(input({ weighIns: old }))).toMatchObject({ status: "on_track" });
  });
});
