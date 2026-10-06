import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  barPercent,
  DEMO_MEAL,
  DEMO_PROFILE_EDIT,
  DEMO_RESULT,
  DEMO_TARGETS,
  DEMO_TODAY,
  DEMO_WEIGHTS_KG,
  DEMO_WORKOUT,
  DEMO_WORKOUT_WEEKS,
  sevenDayAverages,
} from "./demo-data";

describe("barPercent", () => {
  it("rounds and stays between 0 and 100", () => {
    expect(barPercent(1380, 2200)).toBe(63);
    expect(barPercent(5, 0)).toBe(0);
    expect(barPercent(-5, 10)).toBe(0);
    expect(barPercent(30, 10)).toBe(100);
  });
});

describe("demo data", () => {
  it("shows the four macro targets from one place", () => {
    expect(DEMO_RESULT.macros.map((m) => m.grams)).toEqual([
      DEMO_TARGETS.protein,
      DEMO_TARGETS.carbs,
      DEMO_TARGETS.fat,
      DEMO_TARGETS.fiber,
    ]);
  });

  it("keeps the meal inside the day and the day inside the target", () => {
    expect(DEMO_MEAL.mealCalories).toBeLessThanOrEqual(DEMO_MEAL.dayCalories);
    expect(DEMO_MEAL.dayCalories).toBeLessThanOrEqual(DEMO_TARGETS.calories);
    expect(DEMO_MEAL.slots.map((s) => s.slot)).toEqual(["Protein", "Carbs", "Fat", "Fiber"]);
  });

  it("has a workout day with exercises", () => {
    expect(DEMO_WORKOUT.exercises.length).toBeGreaterThan(0);
  });
});

describe("chart demo data", () => {
  it("averages each day with the 6 before it", () => {
    expect(sevenDayAverages([1, 2, 3, 4, 5, 6, 7, 8])).toEqual([4, 5]);
    expect(sevenDayAverages([1, 2, 3])).toEqual([]);
  });

  it("has one average per day from day 7", () => {
    expect(sevenDayAverages(DEMO_WEIGHTS_KG)).toHaveLength(DEMO_WEIGHTS_KG.length - 6);
  });

  it("keeps the sample workout counts and today's macros sensible", () => {
    expect(DEMO_WORKOUT_WEEKS.counts).toHaveLength(6);
    expect(Math.max(...DEMO_WORKOUT_WEEKS.counts)).toBeLessThanOrEqual(DEMO_WORKOUT_WEEKS.planned);
    for (const m of DEMO_TODAY.macros) expect(m.grams).toBeLessThanOrEqual(m.target);
    expect(DEMO_TODAY.macros.filter((m) => m.lead)).toHaveLength(1);
  });

  it("uses the same macro-warning wording as the Profile screen", () => {
    const profile = readFileSync(join(process.cwd(), "src", "components", "profile-form.tsx"), "utf8");
    expect(profile).toContain(DEMO_PROFILE_EDIT.warning);
  });
});
