import { describe, expect, it } from "vitest";
import { ESTIMATE_STEPS, SHOWCASE_SCALE_READOUT } from "./showcase";

describe("honest-estimates steps", () => {
  it("has three rules, each with its own 3D object and two facts", () => {
    expect(ESTIMATE_STEPS.map((step) => step.label)).toEqual(["Starting point", "Trend over today", "You decide"]);
    expect(ESTIMATE_STEPS.map((step) => step.object)).toEqual(["ring", "scale", "sliders"]);
    for (const step of ESTIMATE_STEPS) {
      expect(step.facts).toHaveLength(2);
      expect(step.caption.length).toBeLessThanOrEqual(110);
    }
  });

  it("does not repeat the roadmap stage titles", () => {
    const titles = ESTIMATE_STEPS.map((step) => step.title.toLowerCase());
    for (const stage of ["know your numbers", "fuel your day", "train your week", "track your trend", "review and adjust"]) {
      expect(titles).not.toContain(stage);
    }
  });

  it("uses the demo data and the check-in settings", () => {
    expect(ESTIMATE_STEPS[1].facts[0].value).toMatch(/^\d+\.\d kg$/);
    expect(ESTIMATE_STEPS[1].facts[1].value).toBe(SHOWCASE_SCALE_READOUT);
    expect(ESTIMATE_STEPS[2].facts[0]).toEqual({ label: "Suggestion", value: "100–200 kcal" });
    expect(SHOWCASE_SCALE_READOUT).toMatch(/^\d+\.\d kg$/);
  });
});
