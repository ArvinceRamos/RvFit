import { describe, expect, it } from "vitest";
import { formatLengthCm, formatWeightKg, validateWeighIn } from "./weigh-in";

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

describe("formatWeightKg", () => {
  it("shows kilograms to one decimal for metric users", () => {
    expect(formatWeightKg(80, "metric")).toBe("80.0 kg");
    expect(formatWeightKg(80.26, "metric")).toBe("80.3 kg");
  });

  it("converts to pounds for imperial users", () => {
    expect(formatWeightKg(45.359237, "imperial")).toBe("100.0 lb");
    expect(formatWeightKg(80, "imperial")).toBe("176.4 lb");
  });
});

describe("formatLengthCm", () => {
  it("shows centimeters or inches to one decimal", () => {
    expect(formatLengthCm(81.28, "metric")).toBe("81.3 cm");
    expect(formatLengthCm(81.28, "imperial")).toBe("32.0 in");
  });
});
