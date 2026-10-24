import { describe, expect, it } from "vitest";
import { buildCheckInTarget, checkInMacros, type CheckInSaveInput } from "./check-in-save";

const macros = { protein_g: 150, carbs_g: 250, fat_g: 70, fiber_g: 32 }; // 600 + 1000 + 630 = 2,230 kcal

function input(overrides: Partial<CheckInSaveInput> = {}): CheckInSaveInput {
  return {
    fromKcal: 2230,
    toKcal: 2030,
    macros,
    goal: "lose",
    pace: "steady",
    branch: "male",
    observedKgPerWeek: 0.01234,
    expectedKgPerWeek: -0.45454,
    ...overrides,
  };
}

describe("checkInMacros", () => {
  it("keeps protein grams and the fat-to-carb split, and moves fiber with calories", () => {
    const result = checkInMacros(macros, 2230, 2030);
    if (!result.ok) throw new Error(result.error);
    // 2,030 - 600 = 1,430 kcal left; fat had 630 / 1,630 of it before.
    expect(result.data).toEqual({ protein_g: 150, fat_g: 61, carbs_g: 220, fiber_g: 29 });
    const kcal = result.data.protein_g * 4 + result.data.carbs_g * 4 + result.data.fat_g * 9;
    expect(Math.abs(kcal - 2030)).toBeLessThan(10);
  });

  it("caps protein at 35% of the new target", () => {
    const result = checkInMacros({ protein_g: 200, carbs_g: 150, fat_g: 50, fiber_g: 20 }, 1850, 1650);
    expect(result).toMatchObject({ ok: true, data: { protein_g: 144 } });
  });

  it("keeps fat at the 20% minimum when it met it before", () => {
    // Fat at exactly 20% of 2,000 kcal; a lower target keeps it at 20% of the new one.
    const result = checkInMacros({ protein_g: 175, carbs_g: 225, fat_g: 45, fiber_g: 28 }, 2000, 1800);
    expect(result).toMatchObject({ ok: true, data: { fat_g: 40 } });
  });

  it("leaves a fat share the user set below 20% where they put it", () => {
    const result = checkInMacros({ protein_g: 150, carbs_g: 330, fat_g: 30, fiber_g: 28 }, 2190, 1990);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.fat_g).toBeLessThan(Math.ceil((1990 * 0.2) / 9));
  });
});

describe("buildCheckInTarget", () => {
  it("builds a goal-based row with the same goal and pace and records the check-in", () => {
    const result = buildCheckInTarget(input());
    expect(result).toMatchObject({
      ok: true,
      data: {
        source: "calculated",
        target_kcal: 2030,
        goal: "lose",
        pace: "steady",
        formula_branch: "male",
        floor_applied: false,
        protein_g: 150,
        calculation_inputs: { check_in: { from_kcal: 2230, change_kcal: -200, observed_kg_per_week: 0.012, expected_kg_per_week: -0.455 } },
      },
    });
  });

  it("drops pace for maintain and marks a target at the floor", () => {
    const result = buildCheckInTarget(input({ goal: "maintain", pace: "gradual", fromKcal: 1700, toKcal: 1500, macros: { protein_g: 120, carbs_g: 170, fat_g: 40, fiber_g: 24 } }));
    expect(result).toMatchObject({ ok: true, data: { goal: "maintain", pace: null, floor_applied: true } });
  });

  it("refuses without a formula branch or a pace", () => {
    expect(buildCheckInTarget(input({ branch: null }))).toMatchObject({ ok: false });
    expect(buildCheckInTarget(input({ pace: null }))).toMatchObject({ ok: false });
  });
});
