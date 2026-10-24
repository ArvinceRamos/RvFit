import { describe, expect, it } from "vitest";
import { describeRemaining, formatGrams, formatKcal, formatWeeklyRate, progressPercent } from "./remaining-format";

describe("formatKcal", () => {
  it("rounds to a whole number with a thousands comma", () => {
    expect(formatKcal(1250)).toBe("1,250 kcal");
    expect(formatKcal(2460.6)).toBe("2,461 kcal");
    expect(formatKcal(612.4)).toBe("612 kcal");
    expect(formatKcal(0)).toBe("0 kcal");
  });

  it("never shows -0", () => {
    expect(formatKcal(-0.4)).toBe("0 kcal");
  });
});

describe("formatGrams", () => {
  it("rounds to whole grams", () => {
    expect(formatGrams(42.6)).toBe("43 g");
    expect(formatGrams(42.4)).toBe("42 g");
    expect(formatGrams(1530)).toBe("1,530 g");
    expect(formatGrams(-0.2)).toBe("0 g");
  });
});

describe("describeRemaining", () => {
  it("shows what is left, a reached target, and what is over, in whole numbers", () => {
    expect(describeRemaining(109, "g")).toBe("109 g left");
    expect(describeRemaining(108.6, "g")).toBe("109 g left");
    expect(describeRemaining(2525.4, "kcal")).toBe("2,525 kcal left");
    expect(describeRemaining(0, "g")).toBe("Target reached");
    expect(describeRemaining(-12, "g")).toBe("12 g over target");
  });

  it("calls anything that rounds to 0 a reached target", () => {
    expect(describeRemaining(0.4, "g")).toBe("Target reached");
    expect(describeRemaining(-0.4, "kcal")).toBe("Target reached");
  });
});

describe("progressPercent", () => {
  it("is the share eaten", () => {
    expect(progressPercent(0, 2000)).toBe(0);
    expect(progressPercent(500, 2000)).toBe(25);
  });

  it("stops at 100 when over target", () => {
    expect(progressPercent(2500, 2000)).toBe(100);
  });

  it("is 0 for a missing or zero target and for bad numbers", () => {
    expect(progressPercent(100, 0)).toBe(0);
    expect(progressPercent(100, -5)).toBe(0);
    expect(progressPercent(Number.NaN, 100)).toBe(0);
    expect(progressPercent(-10, 100)).toBe(0);
  });
});

describe("formatWeeklyRate", () => {
  it("shows a signed rate to one decimal in kg or lb", () => {
    expect(formatWeeklyRate(-0.4545, "metric")).toBe("−0.5 kg a week");
    expect(formatWeeklyRate(0.0909, "metric")).toBe("+0.1 kg a week");
    expect(formatWeeklyRate(-0.4545, "imperial")).toBe("−1.0 lb a week");
  });

  it("shows no sign when the rate rounds to zero", () => {
    expect(formatWeeklyRate(0, "metric")).toBe("0.0 kg a week");
    expect(formatWeeklyRate(-0.04, "metric")).toBe("0.0 kg a week");
  });
});
