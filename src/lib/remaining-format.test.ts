import { describe, expect, it } from "vitest";
import { describeRemaining, progressPercent } from "./remaining-format";

describe("describeRemaining", () => {
  it("shows what is left, a reached target, and what is over", () => {
    expect(describeRemaining(109, "g")).toBe("109.0 g left");
    expect(describeRemaining(2525.4, "kcal")).toBe("2,525 kcal left");
    expect(describeRemaining(0, "g")).toBe("Target reached");
    expect(describeRemaining(-12, "g")).toBe("12.0 g over target");
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
