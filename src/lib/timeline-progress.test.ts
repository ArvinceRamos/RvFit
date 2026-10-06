import { describe, expect, it } from "vitest";
import { activeStage, timelineFill } from "./timeline-progress";

describe("timelineFill", () => {
  it("fills from the line's top down to the marker", () => {
    expect(timelineFill(100, 1000, 600)).toBe(0.5);
  });

  it("stays between 0 and 1", () => {
    expect(timelineFill(800, 1000, 400)).toBe(0);
    expect(timelineFill(-2000, 1000, 400)).toBe(1);
  });

  it("is 0 for an empty or broken line", () => {
    expect(timelineFill(0, 0, 400)).toBe(0);
    expect(timelineFill(Number.NaN, 1000, 400)).toBe(0);
  });
});

describe("activeStage", () => {
  const dots = [100, 500, 900, 1300, 1700];

  it("is -1 before the first dot reaches the marker", () => {
    expect(activeStage(dots, 50)).toBe(-1);
  });

  it("is the last dot at or above the marker", () => {
    expect(activeStage(dots, 100)).toBe(0);
    expect(activeStage(dots, 950)).toBe(2);
    expect(activeStage(dots, 5000)).toBe(4);
  });

  it("is -1 with no stages", () => {
    expect(activeStage([], 400)).toBe(-1);
  });
});
