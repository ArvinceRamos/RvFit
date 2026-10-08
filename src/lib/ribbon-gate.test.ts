import { describe, expect, it } from "vitest";
import { calmIndex, ribbonRoute, RIBBON_KEYFRAMES, RIBBON_KEYFRAMES_NARROW, RIBBON_MIN_WIDTH, poseAt, ribbonQuality, shouldRun3D, stopIndex, type RibbonEnv } from "./ribbon-gate";

const desktop: RibbonEnv = { width: 1440, reducedMotion: false, saveData: false, webgl2: true };

describe("shouldRun3D", () => {
  it("runs on a desktop with WebGL 2 and motion allowed", () => {
    expect(shouldRun3D(desktop)).toBe(true);
    expect(shouldRun3D({ ...desktop, width: RIBBON_MIN_WIDTH })).toBe(true);
  });

  it("also runs on phones and small screens", () => {
    expect(shouldRun3D({ ...desktop, width: RIBBON_MIN_WIDTH - 1 })).toBe(true);
    expect(shouldRun3D({ ...desktop, width: 375 })).toBe(true);
  });

  it("falls back with reduced motion, data-saver, or no WebGL", () => {
    expect(shouldRun3D({ ...desktop, reducedMotion: true })).toBe(false);
    expect(shouldRun3D({ ...desktop, saveData: true })).toBe(false);
    expect(shouldRun3D({ ...desktop, webgl2: false })).toBe(false);
  });
});

describe("ribbonRoute", () => {
  it("runs the scroll journey on the landing page only", () => {
    expect(ribbonRoute("/")).toBe("journey");
  });

  it("holds the hero pose on the auth pages", () => {
    for (const path of ["/login", "/signup", "/forgot-password", "/reset-password"]) expect(ribbonRoute(path)).toBe("hero");
  });

  it("is calm on app pages", () => {
    for (const path of ["/dashboard", "/profile", "/meals/new", "/workouts/log/new", "/results"]) expect(ribbonRoute(path)).toBe("calm");
  });
});

describe("calmIndex", () => {
  it("drifts through the soft stops only", () => {
    expect(calmIndex(0, 1000)).toBe(1);
    expect(calmIndex(500, 1000)).toBe(3);
    expect(calmIndex(1000, 1000)).toBe(5);
    expect(calmIndex(5000, 1000)).toBe(5);
    expect(calmIndex(200, 0)).toBe(1);
    for (const i of [1, 2, 3, 4, 5]) expect(RIBBON_KEYFRAMES[i].soft).toBe(1);
  });
});

describe("ribbonQuality", () => {
  it("is full on wide screens and lite below the breakpoint", () => {
    expect(ribbonQuality(1440)).toBe("full");
    expect(ribbonQuality(RIBBON_MIN_WIDTH)).toBe("full");
    expect(ribbonQuality(RIBBON_MIN_WIDTH - 1)).toBe("lite");
    expect(ribbonQuality(375)).toBe("lite");
  });
});

describe("narrow keyframes", () => {
  it("follows the same stops, pulled back and closer to the middle", () => {
    expect(RIBBON_KEYFRAMES_NARROW).toHaveLength(RIBBON_KEYFRAMES.length);
    RIBBON_KEYFRAMES_NARROW.forEach((frame, i) => {
      const wide = RIBBON_KEYFRAMES[i];
      expect(frame.t).toBe(wide.t);
      expect(frame.soft).toBe(wide.soft);
      expect(frame.offset[2]).toBeGreaterThan(wide.offset[2]);
      expect(Math.abs(frame.shift[0])).toBeLessThan(Math.abs(wide.shift[0]));
    });
  });

  it("works with poseAt", () => {
    expect(poseAt(0, RIBBON_KEYFRAMES_NARROW)).toEqual(RIBBON_KEYFRAMES_NARROW[0]);
  });
});

describe("keyframes", () => {
  it("has one stop for the hero, each of the five stages, and the closing", () => {
    expect(RIBBON_KEYFRAMES).toHaveLength(7);
  });

  it("moves forward along the ribbon and stays inside it", () => {
    for (let i = 1; i < RIBBON_KEYFRAMES.length; i++) {
      expect(RIBBON_KEYFRAMES[i].t).toBeGreaterThan(RIBBON_KEYFRAMES[i - 1].t);
    }
    for (const frame of RIBBON_KEYFRAMES) {
      expect(frame.t).toBeGreaterThanOrEqual(0);
      expect(frame.t).toBeLessThanOrEqual(1);
      expect(frame.soft).toBeGreaterThanOrEqual(0);
      expect(frame.soft).toBeLessThanOrEqual(1);
    }
  });

  it("is sharp in the hero and soft behind the stages", () => {
    expect(RIBBON_KEYFRAMES[0].soft).toBe(0);
    for (const frame of RIBBON_KEYFRAMES.slice(1, 6)) expect(frame.soft).toBeGreaterThanOrEqual(0.5);
  });
});

describe("poseAt", () => {
  it("returns the keyframe itself at whole indexes", () => {
    expect(poseAt(0)).toEqual(RIBBON_KEYFRAMES[0]);
    expect(poseAt(3)).toEqual(RIBBON_KEYFRAMES[3]);
    expect(poseAt(6)).toEqual(RIBBON_KEYFRAMES[6]);
  });

  it("clamps outside the range and ignores bad numbers", () => {
    expect(poseAt(-2)).toEqual(RIBBON_KEYFRAMES[0]);
    expect(poseAt(99)).toEqual(RIBBON_KEYFRAMES[6]);
    expect(poseAt(Number.NaN)).toEqual(RIBBON_KEYFRAMES[0]);
  });

  it("eases halfway between two keyframes", () => {
    const a = RIBBON_KEYFRAMES[1];
    const b = RIBBON_KEYFRAMES[2];
    const mid = poseAt(1.5);
    expect(mid.t).toBeCloseTo((a.t + b.t) / 2);
    expect(mid.offset[0]).toBeCloseTo((a.offset[0] + b.offset[0]) / 2);
    expect(mid.soft).toBeCloseTo((a.soft + b.soft) / 2);
  });
});

describe("stopIndex", () => {
  const stops = [0, 800, 1600, 2000];

  it("is 0 at or above the first stop and the last index past the end", () => {
    expect(stopIndex(-50, stops)).toBe(0);
    expect(stopIndex(0, stops)).toBe(0);
    expect(stopIndex(2000, stops)).toBe(3);
    expect(stopIndex(5000, stops)).toBe(3);
  });

  it("is fractional between stops", () => {
    expect(stopIndex(400, stops)).toBeCloseTo(0.5);
    expect(stopIndex(1800, stops)).toBeCloseTo(2.5);
  });

  it("handles too few stops and stops at the same place", () => {
    expect(stopIndex(300, [])).toBe(0);
    expect(stopIndex(300, [0])).toBe(0);
    expect(stopIndex(900, [0, 900, 900, 1200])).toBe(2);
    expect(stopIndex(1050, [0, 900, 900, 1200])).toBeCloseTo(2.5);
  });
});
