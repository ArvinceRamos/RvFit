import { describe, expect, it } from "vitest";
import { RIBBON_KEYFRAMES_NARROW, stopIndex } from "@/lib/ribbon-gate";
import { ribbonStops } from "./ribbon-stops";

describe("ribbonStops", () => {
  it("puts each card's middle in the middle of the screen, between the top and the end", () => {
    expect(ribbonStops([900, 1300, 1700, 2100, 2500], 800, 4000)).toEqual([0, 500, 900, 1300, 1700, 2100, 3200]);
  });

  it("gives one stop per web keyframe for the five stages", () => {
    expect(ribbonStops([900, 1300, 1700, 2100, 2500], 800, 4000)).toHaveLength(RIBBON_KEYFRAMES_NARROW.length);
  });

  it("keeps stops in order and inside the scroll range", () => {
    expect(ribbonStops([200, 100, 5000], 800, 2000)).toEqual([0, 0, 0, 1200, 1200]);
  });

  it("is all zero when the content fits on the screen", () => {
    expect(ribbonStops([300, 500], 800, 700)).toEqual([0, 0, 0, 0]);
  });

  it("turns a scroll position into a fractional stop with the shared stopIndex", () => {
    const stops = ribbonStops([900, 1300, 1700, 2100, 2500], 800, 4000);
    expect(stopIndex(0, stops)).toBe(0);
    expect(stopIndex(250, stops)).toBe(0.5);
    expect(stopIndex(3200, stops)).toBe(6);
  });
});
