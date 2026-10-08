import { describe, expect, it } from "vitest";
import { expectedKgPerWeek, targetCheckIn, type CheckInInput } from "./check-in";

const day = 24 * 60 * 60 * 1000;
const now = 200 * day;

// Three weigh-ins in the week 14-21 days ago and three in the last week.
function weighIns(earlierKg: number, nowKg: number) {
  return [
    ...[20, 18, 16].map((daysAgo) => ({ time: now - daysAgo * day, kg: earlierKg })),
    ...[6, 4, 1].map((daysAgo) => ({ time: now - daysAgo * day, kg: nowKg })),
  ];
}

function input(overrides: Partial<CheckInInput> = {}): CheckInInput {
  return {
    targetKcal: 2200,
    targetSetAt: now - 30 * day,
    goal: "lose",
    pace: "steady",
    floorApplied: false,
    branch: "male",
    weighIns: weighIns(90, 89),
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

describe("targetCheckIn", () => {
  it("says nothing without a goal (for example, only manual targets so far)", () => {
    expect(targetCheckIn(input({ goal: null, pace: null }))).toEqual({ status: "no_goal" });
  });

  it("waits until two weeks of enough weigh-ins exist after the target was set", () => {
    const fresh = targetCheckIn(input({ targetSetAt: now - 10 * day }));
    expect(fresh).toMatchObject({ status: "not_enough_data", availableFrom: now + 11 * day });
    const sparse = targetCheckIn(input({ weighIns: weighIns(90, 89).slice(1) }));
    expect(sparse).toMatchObject({ status: "not_enough_data", availableFrom: null, earlierWeek: 2, thisWeek: 3 });
  });

  it("is on track when the trend is close to the pace", () => {
    // -1 kg over two weeks = -0.5 kg a week against about -0.45 expected.
    expect(targetCheckIn(input())).toMatchObject({ status: "on_track" });
  });

  it("suggests eating a little less when weight is not moving on a loss goal", () => {
    const result = targetCheckIn(input({ weighIns: weighIns(90, 90) }));
    expect(result).toEqual(expect.objectContaining({ status: "adjust", changeKcal: -200, suggestedKcal: 2000 }));
  });

  it("suggests eating a little more when losing much faster than planned", () => {
    // -3 kg in two weeks = -1.5 kg a week against about -0.45 expected.
    const result = targetCheckIn(input({ weighIns: weighIns(92, 89) }));
    expect(result).toEqual(expect.objectContaining({ status: "adjust", changeKcal: 200, suggestedKcal: 2400 }));
  });

  it("keeps changes between 100 and 200 kcal in 50 kcal steps", () => {
    // Maintain, drifting up 0.3 kg a week: about 330 kcal a day, capped at 200.
    const drifting = targetCheckIn(input({ goal: "maintain", pace: null, weighIns: weighIns(80, 80.6) }));
    expect(drifting).toMatchObject({ status: "adjust", changeKcal: -200 });
    // Maintain, drifting up 0.2 kg a week: about 220 kcal, also capped.
    const small = targetCheckIn(input({ goal: "maintain", pace: null, weighIns: weighIns(80, 80.36) }));
    expect(small).toMatchObject({ status: "adjust", changeKcal: -200 });
  });

  it("rounds the suggested target to 50 kcal", () => {
    const result = targetCheckIn(input({ targetKcal: 2099, weighIns: weighIns(90, 90) }));
    expect(result).toMatchObject({ status: "adjust", suggestedKcal: 1900, changeKcal: -199 });
  });

  it("never suggests going below the calorie floor", () => {
    const atFloor = targetCheckIn(input({ targetKcal: 1500, floorApplied: true, weighIns: weighIns(90, 90) }));
    expect(atFloor).toMatchObject({ status: "at_floor", floorKcal: 1500 });
    const nearFloor = targetCheckIn(input({ targetKcal: 1550, weighIns: weighIns(90, 90) }));
    expect(nearFloor).toMatchObject({ status: "adjust", changeKcal: -50, suggestedKcal: 1500 });
  });

  it("ignores weigh-ins from before the target was set", () => {
    const old = [{ time: now - 60 * day, kg: 100 }, ...weighIns(90, 89)];
    expect(targetCheckIn(input({ weighIns: old }))).toMatchObject({ status: "on_track" });
  });
});
