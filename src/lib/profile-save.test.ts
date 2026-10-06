import { describe, expect, it } from "vitest";
import { calculateDefaultMacros, calculateTarget, checkMacroMismatch } from "./calc/calculate";
import {
  buildProfileSave,
  computeProfileTarget,
  heightFields,
  readMacros,
  weightField,
  weightUnchanged,
  type ProfileFormInput,
} from "./profile-save";

const calculated: ProfileFormInput = {
  method: "calculated",
  units: "metric",
  age: "30",
  height: "180",
  feet: "",
  inches: "",
  weight: "80",
  sex: "male",
  activity: "moderate",
  goal: "lose",
  pace: "gradual",
  targetKcal: "",
};
const manual: ProfileFormInput = { ...calculated, method: "manual", targetKcal: "2200", age: "", height: "", sex: "", activity: "" };

describe("form pre-fill helpers", () => {
  it("shows weight in the form's units to one decimal", () => {
    expect(weightField(80.26, "metric")).toBe("80.3");
    expect(weightField(80, "imperial")).toBe("176.4");
  });

  it("shows height in cm or whole feet plus inches", () => {
    expect(heightFields(180, "metric")).toEqual({ height: "180", feet: "", inches: "" });
    expect(heightFields(180, "imperial")).toEqual({ height: "", feet: "5", inches: "10.9" });
    // 182.87 cm is 71.996 in, which rounds to 6 ft 0 in rather than 5 ft 12 in.
    expect(heightFields(182.87, "imperial")).toEqual({ height: "", feet: "6", inches: "0" });
  });

  it("treats the pre-filled weight as unchanged in either unit", () => {
    expect(weightUnchanged(80.3, "metric", 80.26)).toBe(true);
    expect(weightUnchanged(176.9, "imperial", 80.26)).toBe(true);
    expect(weightUnchanged(80.4, "metric", 80.26)).toBe(false);
    expect(weightUnchanged(80, "metric", null)).toBe(false);
  });
});

describe("computeProfileTarget", () => {
  it("matches the existing calculator for a calculated target", () => {
    const result = computeProfileTarget(calculated, null);
    if (!result.ok) throw new Error(result.error);
    const expected = calculateTarget({
      age_years: 30, height: { unit: "cm", value: 180 }, weight: { unit: "kg", value: 80 },
      sex: "male", activity_level: "moderate", goal: "lose", pace: "gradual",
    });
    if (!expected.ok) throw new Error(expected.error);
    expect(result.data.target.target_kcal).toBe(expected.data.target_kcal);
    expect(result.data.defaults).toEqual((calculateDefaultMacros(expected.data.target_kcal, 80) as { data: unknown }).data);
    expect(result.data.target).toMatchObject({ source: "calculated", goal: "lose", pace: "gradual", formula_branch: "male", floor_applied: false });
    expect(result.data.profile).toEqual({ preferred_units: "metric", age_years: 30, sex_formula_branch: "male", height_cm: 180, activity_level: "moderate" });
  });

  it("saves a new weigh-in only when the weight changed", () => {
    expect((computeProfileTarget(calculated, null) as { data: { body_log: unknown } }).data.body_log).toEqual({ weight_kg: 80 });
    expect((computeProfileTarget({ ...calculated, weight: "80.0" }, 80.04) as { data: { body_log: unknown } }).data.body_log).toBeNull();
    expect((computeProfileTarget({ ...calculated, weight: "81" }, 80) as { data: { body_log: unknown } }).data.body_log).toEqual({ weight_kg: 81 });
  });

  it("uses the exact saved weight when the shown weight is unchanged", () => {
    const result = computeProfileTarget({ ...calculated, units: "imperial", weight: "176.9", height: "", feet: "5", inches: "11" }, 80.26);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.body_log).toBeNull();
    expect(result.data.target.calculation_inputs.weight_kg).toBe(80.26);
  });

  it("converts imperial height and weight", () => {
    const result = computeProfileTarget({ ...calculated, units: "imperial", height: "", feet: "5", inches: "11", weight: "176" }, null);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.profile.height_cm).toBe(180.34);
    expect(result.data.profile.preferred_units).toBe("imperial");
    expect(result.data.body_log?.weight_kg).toBeCloseTo(79.83, 2);
  });

  it("drops pace for maintain and shows the floor explanation when it applies", () => {
    const maintain = computeProfileTarget({ ...calculated, goal: "maintain" }, null);
    if (!maintain.ok) throw new Error(maintain.error);
    expect(maintain.data.target.pace).toBeNull();
    const floored = computeProfileTarget({ ...calculated, sex: "female", age: "90", height: "150", weight: "40", activity: "sedentary", goal: "lose", pace: "steady" }, null);
    if (!floored.ok) throw new Error(floored.error);
    expect(floored.data.target.floor_applied).toBe(true);
    expect(floored.data.floor_explanation).toContain("1200");
  });

  it("follows the manual rules and keeps saved details", () => {
    const result = computeProfileTarget(manual, null);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.profile).toEqual({ preferred_units: "metric" });
    expect(result.data.target).toMatchObject({ source: "manual", target_kcal: 2200, goal: null, pace: null, formula_branch: null });
    expect(computeProfileTarget({ ...manual, targetKcal: "900" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...manual, targetKcal: "" }, null)).toMatchObject({ ok: false });
  });

  it("rejects missing or out-of-range details with the calculator's messages", () => {
    expect(computeProfileTarget({ ...calculated, age: "17" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, age: "30.5" }, null)).toEqual({ ok: false, error: "Enter your age as a whole number." });
    expect(computeProfileTarget({ ...calculated, sex: "" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, activity: "" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, height: "" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, weight: "abc" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, weight: "500" }, null)).toMatchObject({ ok: false });
  });

  it("rejects malformed input", () => {
    expect(computeProfileTarget(null, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, method: "other" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, units: "stone" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, activity: "couch" }, null)).toMatchObject({ ok: false });
    expect(computeProfileTarget({ ...calculated, age: 30 }, null)).toMatchObject({ ok: false });
  });
});

describe("readMacros", () => {
  it("accepts whole grams that pass the macro rules", () => {
    expect(readMacros({ protein_g: 150, carbs_g: 200, fat_g: 70, fiber_g: 30 }, 2000)).toMatchObject({ ok: true });
  });

  it("rejects fractions, negatives, missing values, and protein over the cap", () => {
    expect(readMacros({ protein_g: 150.5, carbs_g: 200, fat_g: 70, fiber_g: 30 }, 2000)).toMatchObject({ ok: false });
    expect(readMacros({ protein_g: -1, carbs_g: 200, fat_g: 70, fiber_g: 30 }, 2000)).toMatchObject({ ok: false });
    expect(readMacros({ protein_g: 150, carbs_g: 200, fat_g: 70 }, 2000)).toMatchObject({ ok: false });
    expect(readMacros({ protein_g: 200, carbs_g: 200, fat_g: 70, fiber_g: 30 }, 2000)).toEqual({ ok: false, error: "Protein cannot exceed 35% of target calories." });
    expect(readMacros(null, 2000)).toMatchObject({ ok: false });
  });

  it("allows a macro mismatch over 5%, which is only a warning", () => {
    const macros = { protein_g: 100, carbs_g: 100, fat_g: 30, fiber_g: 20 };
    expect(readMacros(macros, 2000)).toMatchObject({ ok: true });
    expect((checkMacroMismatch(macros, 2000) as { data: { warning: boolean } }).data.warning).toBe(true);
  });
});

describe("buildProfileSave", () => {
  it("rebuilds the target on the server and adds the edited macros", () => {
    const result = buildProfileSave({ details: manual, macros: { protein_g: 150, carbs_g: 240, fat_g: 70, fiber_g: 31 } }, 80);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.target).toMatchObject({ source: "manual", target_kcal: 2200, protein_g: 150, carbs_g: 240, fat_g: 70, fiber_g: 31 });
    expect(result.data.body_log).toBeNull();
  });

  it("ignores any calorie number sent from the browser", () => {
    const result = buildProfileSave({ details: manual, target_kcal: 5000, macros: { protein_g: 150, carbs_g: 240, fat_g: 70, fiber_g: 31 } }, 80);
    expect(result.ok && result.data.target.target_kcal).toBe(2200);
  });

  it("checks macros against the recalculated target", () => {
    expect(buildProfileSave({ details: manual, macros: { protein_g: 300, carbs_g: 100, fat_g: 50, fiber_g: 20 } }, 80)).toEqual({
      ok: false,
      error: "Protein cannot exceed 35% of target calories.",
    });
    expect(buildProfileSave({ details: manual }, 80)).toMatchObject({ ok: false });
    expect(buildProfileSave(null, 80)).toMatchObject({ ok: false });
  });
});
