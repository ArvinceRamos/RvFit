import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  barPercent,
  DEMO_MEAL,
  DEMO_OWN_TARGET,
  DEMO_PROFILE_EDIT,
  DEMO_RESULT,
  DEMO_SWAP_KEYS,
  DEMO_TARGETS,
  DEMO_TODAY,
  DEMO_WEIGHTS_KG,
  DEMO_WORKOUT,
  DEMO_WEIGHT_RANGES,
  DEMO_WORKOUT_WEEKS,
  demoMacroWarning,
  demoWeightWindow,
  sevenDayAverages,
} from "./demo-data";
import { checkMacroMismatch } from "./calc/calculate";
import { getExercise } from "./workouts/exercises";

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

  it("has a workout day made only of real library exercises", () => {
    expect(DEMO_WORKOUT.exerciseKeys.length).toBeGreaterThan(0);
    for (const key of DEMO_WORKOUT.exerciseKeys) expect(getExercise(key)).toBeDefined();
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

describe("redesigned preview data", () => {
  it("gives the own target believable macros (no 5% warning)", () => {
    const g = (label: string) => DEMO_OWN_TARGET.macros.find((m) => m.label === label)!.grams;
    const result = checkMacroMismatch({ protein_g: g("Protein"), carbs_g: g("Carbs"), fat_g: g("Fat"), fiber_g: g("Fiber") }, DEMO_OWN_TARGET.calories);
    expect(result.ok && result.data.warning).toBe(false);
  });

  it("never shows more workouts this week than planned", () => {
    const now = DEMO_WORKOUT_WEEKS.counts[DEMO_WORKOUT_WEEKS.counts.length - 1];
    expect(now).toBeLessThanOrEqual(DEMO_WORKOUT_WEEKS.planned);
  });
});

describe("interactive preview data", () => {
  it("unticking the meal takes exactly its calories off the day", () => {
    expect(DEMO_MEAL.eatenBefore + DEMO_MEAL.mealCalories).toBe(DEMO_MEAL.dayCalories);
  });

  it("swaps only to real exercises from the library, starting with the shown one", () => {
    expect(DEMO_SWAP_KEYS[0]).toBe(DEMO_WORKOUT.exerciseKeys[0]);
    for (const key of DEMO_SWAP_KEYS) expect(getExercise(key)).toBeDefined();
  });

  it("has 90 days of weigh-ins and a full average line for every range", () => {
    expect(DEMO_WEIGHTS_KG).toHaveLength(90);
    for (const days of DEMO_WEIGHT_RANGES) {
      const { weights, averages, offset } = demoWeightWindow(days);
      expect(weights).toHaveLength(days);
      expect(offset).toBe(days === 90 ? 6 : 0);
      expect(averages).toHaveLength(days - offset);
    }
  });

  it("shows the macro warning for the edited carbs and not for the plain targets", () => {
    const edited = DEMO_PROFILE_EDIT.macros.find((m) => m.label === "Carbs")!.grams;
    expect(demoMacroWarning(edited)).toBe(true);
    expect(demoMacroWarning(DEMO_TARGETS.carbs)).toBe(false);
    expect(edited % DEMO_PROFILE_EDIT.carbStep).toBe(0);
  });
});
