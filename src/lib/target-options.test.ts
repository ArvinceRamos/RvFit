import { describe, expect, it } from "vitest";
import { goalPaceLabel } from "./target-options";

describe("goalPaceLabel", () => {
  it("names the goal and pace in plain words", () => {
    expect(goalPaceLabel("lose", "gradual")).toBe("Lose weight · Slow pace");
    expect(goalPaceLabel("gain", "steady")).toBe("Gain weight · Faster pace");
    expect(goalPaceLabel("maintain", null)).toBe("Maintain");
  });

  it("is null for a manual target with no goal", () => {
    expect(goalPaceLabel(null, null)).toBeNull();
  });
});
