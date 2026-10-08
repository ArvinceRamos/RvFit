import { describe, expect, it } from "vitest";
import { nextWorkout } from "./next-up";

const abc = [
  { key: "a", name: "Full body A" },
  { key: "b", name: "Full body B" },
  { key: "c", name: "Full body C" },
];

describe("nextWorkout", () => {
  it("starts with the first day of the week's plan", () => {
    expect(nextWorkout(abc, 3, [])).toEqual({ status: "next", dayKey: "a", dayName: "Full body A", done: 0, planned: 3 });
  });

  it("moves on as days are logged, in any order", () => {
    expect(nextWorkout(abc, 3, ["a"])).toMatchObject({ status: "next", dayKey: "b", done: 1 });
    expect(nextWorkout(abc, 3, ["b"])).toMatchObject({ status: "next", dayKey: "a", done: 1 });
  });

  it("repeats a short split to fill the training days", () => {
    const ab = abc.slice(0, 2);
    expect(nextWorkout(ab, 4, ["a", "b"])).toMatchObject({ status: "next", dayKey: "a", done: 2, planned: 4 });
    expect(nextWorkout(ab, 4, ["a", "b", "a"])).toMatchObject({ status: "next", dayKey: "b", done: 3 });
  });

  it("is done when every planned day is logged", () => {
    expect(nextWorkout(abc, 3, ["a", "b", "c"])).toEqual({ status: "done", done: 3, planned: 3 });
  });

  it("is null without a plan", () => {
    expect(nextWorkout([], 3, [])).toBeNull();
  });
});
