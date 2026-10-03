import { describe, expect, it } from "vitest";
import { validateWeighIn } from "./weigh-in";

describe("weigh-in validation", () => {
  it("accepts a valid metric weigh-in", () => {
    expect(validateWeighIn({ weight: "75", waist: "80", chest: "100", hips: "95" }, "metric")).toEqual({
      ok: true,
      data: { weight_kg: 75, waist_cm: 80, chest_cm: 100, hips_cm: 95 },
    });
  });

  it("converts imperial values before validating", () => {
    const result = validateWeighIn({ weight: "154.3236", waist: "31.5", chest: "", hips: "" }, "imperial");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.weight_kg).toBeCloseTo(70, 4);
      expect(result.data.waist_cm).toBeCloseTo(80.01, 4);
    }
  });

  it("rejects an out-of-range weight", () => {
    expect(validateWeighIn({ weight: "29", waist: "", chest: "", hips: "" }, "metric")).toMatchObject({
      ok: false,
      error: "Weight must be between 30 and 300 kg.",
    });
  });

  it("allows blank optional measurements", () => {
    expect(validateWeighIn({ weight: "75", waist: "", chest: "", hips: "" }, "metric")).toEqual({
      ok: true,
      data: { weight_kg: 75, waist_cm: null, chest_cm: null, hips_cm: null },
    });
  });

  it("rejects non-numeric input", () => {
    expect(validateWeighIn({ weight: "seventy", waist: "", chest: "", hips: "" }, "metric")).toMatchObject({
      ok: false,
      error: "Weight must be a number.",
    });
  });
});
