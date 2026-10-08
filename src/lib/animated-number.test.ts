import { describe, expect, it } from "vitest";
import { animatedValue, easeOutCubic } from "./animated-number";

describe("easeOutCubic", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it("moves fast first and slows down", () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
  });

  it("clamps progress outside 0..1", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe("animatedValue", () => {
  it("counts up from 0 to 500", () => {
    expect(animatedValue(0, 500, 0)).toBe(0);
    expect(animatedValue(0, 500, 1)).toBe(500);
    const middle = animatedValue(0, 500, 0.5);
    expect(middle).toBeGreaterThan(0);
    expect(middle).toBeLessThan(500);
  });

  it("counts down when the target is lower", () => {
    expect(animatedValue(500, 0, 1)).toBe(0);
    expect(animatedValue(500, 0, 0.5)).toBeLessThan(500);
  });
});
