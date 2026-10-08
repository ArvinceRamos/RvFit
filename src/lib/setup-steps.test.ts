import { describe, expect, it } from "vitest";
import { setupComplete, setupSteps } from "./setup-steps";

const none = { hasTarget: false, hasPreferences: false, hasMeal: false, hasWeighIn: false };

describe("setupSteps", () => {
  it("lists target, preferences, meal, and weigh-in in order", () => {
    expect(setupSteps(none).map((step) => step.key)).toEqual(["hasTarget", "hasPreferences", "hasMeal", "hasWeighIn"]);
    expect(setupSteps(none).every((step) => !step.done)).toBe(true);
  });

  it("marks only steps backed by saved data as done", () => {
    const steps = setupSteps({ ...none, hasTarget: true, hasWeighIn: true });
    expect(steps.filter((step) => step.done).map((step) => step.key)).toEqual(["hasTarget", "hasWeighIn"]);
  });

  it("is complete only when every step is done", () => {
    expect(setupComplete({ hasTarget: true, hasPreferences: true, hasMeal: true, hasWeighIn: false })).toBe(false);
    expect(setupComplete({ hasTarget: true, hasPreferences: true, hasMeal: true, hasWeighIn: true })).toBe(true);
  });
});
