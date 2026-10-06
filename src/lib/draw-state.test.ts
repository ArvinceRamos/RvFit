import { describe, expect, it } from "vitest";
import { DRAW_IN_RATIO, nextDrawState } from "./draw-state";

describe("nextDrawState", () => {
  it("arms a chart that leaves the screen, so it draws in again", () => {
    expect(nextDrawState("done", false, 0)).toBe("armed");
    expect(nextDrawState(undefined, false, 0)).toBe("armed");
  });

  it("draws once enough of the chart is on screen", () => {
    expect(nextDrawState("armed", true, DRAW_IN_RATIO)).toBe("done");
    expect(nextDrawState("armed", true, 1)).toBe("done");
  });

  it("keeps the current state while only an edge is showing", () => {
    expect(nextDrawState("armed", true, 0.1)).toBe("armed");
    expect(nextDrawState("done", true, 0.1)).toBe("done");
    expect(nextDrawState(undefined, true, 0.1)).toBe(undefined);
  });
});
