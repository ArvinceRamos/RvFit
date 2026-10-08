import { describe, expect, it } from "vitest";
import {
  calculateDefaultMacros,
  calculateTarget,
  checkMacroMismatch,
  convertAndValidateInputs,
  createManualTarget,
  validateMacroEdit,
  type MacroEdit,
} from "./calculate";

const metricInputs = {
  age_years: 30,
  height: { unit: "cm", value: 180 } as const,
  weight: { unit: "kg", value: 80 } as const,
};

describe("convertAndValidateInputs", () => {
  it("returns metric values for metric input", () => {
    expect(convertAndValidateInputs(metricInputs)).toEqual({
      ok: true,
      data: { age_years: 30, height_cm: 180, weight_kg: 80 },
    });
  });

  it("converts imperial input before validating ranges", () => {
    const result = convertAndValidateInputs({
      age_years: 30,
      height: { unit: "ft-in", feet: 5, inches: 11 },
      weight: { unit: "lb", value: 176.3698099 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.height_cm).toBeCloseTo(180.34, 2);
      expect(result.data.weight_kg).toBeCloseTo(80, 4);
    }
  });

  it("gives underage users a clear error", () => {
    const result = convertAndValidateInputs({
      ...metricInputs,
      age_years: 17,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("at least 18") });
  });

  it("rejects ages above the configured range", () => {
    const result = convertAndValidateInputs({
      ...metricInputs,
      age_years: 101,
    });
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("18 and 100") });
  });

  it("rejects height and weight outside their configured ranges", () => {
    expect(
      convertAndValidateInputs({
        ...metricInputs,
        height: { unit: "cm", value: 231 },
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("Height") });

    expect(
      convertAndValidateInputs({
        ...metricInputs,
        weight: { unit: "kg", value: 301 },
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("Weight") });
  });
});

describe("input edge cases", () => {
  const base = { age_years: 30, weight: { unit: "kg", value: 80 } } as const;

  it("rejects inches outside 0 to under 12, even when the total height looks valid", () => {
    const tooMany = convertAndValidateInputs({ ...base, height: { unit: "ft-in", feet: 5, inches: 30 } });
    const negative = convertAndValidateInputs({ ...base, height: { unit: "ft-in", feet: 7, inches: -20 } });
    expect(tooMany).toEqual({ ok: false, error: "Inches must be at least 0 and less than 12." });
    expect(negative).toEqual({ ok: false, error: "Inches must be at least 0 and less than 12." });
    expect(convertAndValidateInputs({ ...base, height: { unit: "ft-in", feet: 5, inches: 11.5 } }).ok).toBe(true);
  });

  it("rejects fractional feet", () => {
    expect(convertAndValidateInputs({ ...base, height: { unit: "ft-in", feet: 5.5, inches: 0 } }).ok).toBe(false);
  });

  it("rejects fractional ages, matching the save rules", () => {
    const result = convertAndValidateInputs({ ...base, age_years: 18.7, height: { unit: "cm", value: 175 } });
    expect(result).toEqual({ ok: false, error: "Enter your age in whole years." });
  });
});

describe("calculateTarget", () => {
  it("calculates the male maintenance estimate and returns its config version", () => {
    expect(
      calculateTarget({
        ...metricInputs,
        sex: "male",
        activity_level: "moderate",
        goal: "maintain",
      }),
    ).toMatchObject({
      ok: true,
      data: {
        target_kcal: 2759,
        floor_applied: false,
        floor_explanation: null,
        formula_branch: "male",
        config_version: expect.any(String),
      },
    });
  });

  it("applies the female floor after the steady loss adjustment", () => {
    const result = calculateTarget({
      age_years: 25,
      height: { unit: "cm", value: 165 },
      weight: { unit: "kg", value: 60 },
      sex: "female",
      activity_level: "sedentary",
      goal: "lose",
      pace: "steady",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        target_kcal: 1200,
        floor_applied: true,
        floor_explanation: expect.stringContaining("female formula floor"),
        formula_branch: "female",
      },
    });
  });

  it("says loss will be slower when the floor shrinks the deficit", () => {
    const result = calculateTarget({
      age_years: 25,
      height: { unit: "cm", value: 165 },
      weight: { unit: "kg", value: 60 },
      sex: "female",
      activity_level: "sedentary",
      goal: "lose",
      pace: "steady",
    });
    // Maintenance is about 1,614 kcal, so the 1,200 floor is still about 414 kcal below it.
    expect(result.ok && result.data.floor_explanation).toContain("only about 414 kcal below your estimated maintenance of about 1,614 kcal");
    expect(result.ok && result.data.floor_explanation).toContain("expect slower loss");
  });

  it("never promises loss when the floor is at or above maintenance", () => {
    const small = {
      age_years: 70,
      height: { unit: "cm", value: 150 },
      weight: { unit: "kg", value: 45 },
      sex: "female",
      activity_level: "sedentary",
    } as const;
    const lose = calculateTarget({ ...small, goal: "lose", pace: "steady" });
    const maintain = calculateTarget({ ...small, goal: "maintain" });
    // Maintenance is about 1,052 kcal, below the 1,200 floor.
    expect(lose.ok && lose.data.target_kcal).toBe(1200);
    expect(lose.ok && lose.data.floor_explanation).toContain("not expected to cause weight loss");
    expect(lose.ok && lose.data.floor_explanation).toContain("weekly estimate for your pace does not apply");
    expect(lose.ok && lose.data.floor_explanation).toContain("about 1,052 kcal");
    expect(maintain.ok && maintain.data.floor_explanation).toContain("you may gain weight slowly");
  });

  it("supports configured gain pace options", () => {
    const gradual = calculateTarget({
      ...metricInputs,
      sex: "male",
      activity_level: "moderate",
      goal: "gain",
      pace: "gradual",
    });
    const steady = calculateTarget({
      ...metricInputs,
      sex: "male",
      activity_level: "moderate",
      goal: "gain",
      pace: "steady",
    });

    expect(gradual.ok && gradual.data.target_kcal).toBe(2859);
    expect(steady.ok && steady.data.target_kcal).toBe(2959);
  });

  it("requires a pace when the goal uses one", () => {
    expect(
      calculateTarget({
        ...metricInputs,
        sex: "male",
        activity_level: "moderate",
        goal: "lose",
      }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("pace") });
  });
});

describe("calculateDefaultMacros", () => {
  it("rounds default macros and derives carbs from the remaining calories", () => {
    expect(calculateDefaultMacros(2759.4, 80)).toEqual({
      ok: true,
      data: { protein_g: 128, carbs_g: 422, fat_g: 62, fiber_g: 39 },
    });
  });

  it("caps protein for a heavy current weight and low calorie target", () => {
    const result = calculateDefaultMacros(1200, 300);
    expect(result).toMatchObject({ ok: true, data: { protein_g: 105 } });
  });
});

describe("createManualTarget", () => {
  it("rejects a target below the lowest configured floor", () => {
    expect(
      createManualTarget({ target_kcal: 1100, current_weight: { unit: "kg", value: 60 } }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("minimum of 1200") });
  });

  it("accepts the lowest configured floor and calculates macros from current weight", () => {
    const result = createManualTarget({
      target_kcal: 1200,
      current_weight: { unit: "kg", value: 60 },
    });
    expect(result).toMatchObject({
      ok: true,
      data: {
        target_kcal: 1200,
        macros: { protein_g: 96 },
        config_version: expect.any(String),
      },
    });
  });

  it("rejects a target above the database bound", () => {
    expect(
      createManualTarget({ target_kcal: 7000, current_weight: { unit: "kg", value: 60 } }),
    ).toMatchObject({ ok: false, error: expect.stringContaining("800 and 6000") });
  });
});

describe("validateMacroEdit", () => {
  const validMacros: MacroEdit = {
    protein_g: 100,
    carbs_g: 200,
    fat_g: 50,
    fiber_g: 28,
  };

  it("rejects negative macro grams", () => {
    expect(
      validateMacroEdit({ ...validMacros, carbs_g: -1 }, 2000),
    ).toMatchObject({ ok: false, error: expect.stringContaining("cannot be negative") });
  });

  it("rejects protein above 35% of target calories", () => {
    expect(
      validateMacroEdit({ ...validMacros, protein_g: 176 }, 2000),
    ).toMatchObject({ ok: false, error: expect.stringContaining("35%") });
  });
});

describe("checkMacroMismatch", () => {
  it("warns just above 5% and does not warn at exactly 5%", () => {
    const exactlyFivePercent = checkMacroMismatch(
      { protein_g: 0, carbs_g: 525, fat_g: 0, fiber_g: 0 },
      2000,
    );
    const justAboveFivePercent = checkMacroMismatch(
      { protein_g: 0, carbs_g: 526, fat_g: 0, fiber_g: 0 },
      2000,
    );

    expect(exactlyFivePercent).toMatchObject({
      ok: true,
      data: { macro_derived_kcal: 2100, difference_fraction: 0.05, warning: false },
    });
    expect(justAboveFivePercent).toMatchObject({
      ok: true,
      data: { macro_derived_kcal: 2104, warning: true },
    });
  });
});
