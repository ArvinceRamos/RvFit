import { describe, expect, it } from "vitest";
import { choiceLabel, planSummary, restText, schemeText } from "./format";

const scheme = { sets: 3, reps: { min: 8, max: 12 }, restSeconds: 90 };

describe("workout text", () => {
  it("builds the summary line", () => {
    expect(planSummary("beginner", 3, "dumbbell_only")).toBe("Beginner · 3 days a week · Dumbbells only");
    expect(planSummary("intermediate", 6, "gym")).toBe("Intermediate · 6 days a week · Gym");
  });

  it("shows reps or seconds and rest", () => {
    expect(schemeText(scheme, { measure: "reps" })).toBe("3 sets × 8–12 reps");
    expect(schemeText({ ...scheme, sets: 2, reps: { min: 20, max: 40 } }, { measure: "seconds" })).toBe("2 sets × 20–40 seconds");
    expect(restText(scheme)).toBe("Rest 90 s");
  });

  it("labels a swap choice with its equipment", () => {
    expect(choiceLabel({ name: "Goblet squat", equipment: "dumbbell_only" })).toBe("Goblet squat (dumbbells)");
    expect(choiceLabel({ name: "Leg press", equipment: "gym" })).toBe("Leg press (gym)");
    expect(choiceLabel({ name: "Push-up", equipment: "bodyweight" })).toBe("Push-up (bodyweight)");
  });
});
