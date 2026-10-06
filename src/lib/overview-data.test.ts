import { describe, expect, it } from "vitest";
import { mealTotals } from "./meal";
import { eatenAndPlanned } from "./overview-data";

const food = { kcal_per_100g: 100, protein_g_per_100g: 10, carbs_g_per_100g: 20, fat_g_per_100g: 5, fiber_g_per_100g: 1 };
const meal = (eaten: boolean, grams: number) => ({ eaten, totals: mealTotals([{ food, grams }]) });

describe("eatenAndPlanned", () => {
  it("counts only eaten meals in the totals and keeps planned ones apart", () => {
    const split = eatenAndPlanned([meal(true, 100), meal(false, 300), meal(true, 200)]);
    expect(split.totals).toMatchObject({ kcal: 300, protein_g: 30, carbs_g: 60, fat_g: 15 });
    expect(split.planned).toMatchObject({ kcal: 300, protein_g: 30 });
    expect(split.eaten_count).toBe(2);
    expect(split.meal_count).toBe(3);
  });

  it("gives zero totals when nothing is eaten yet", () => {
    const split = eatenAndPlanned([meal(false, 100)]);
    expect(split.totals.kcal).toBe(0);
    expect(split.eaten_count).toBe(0);
    expect(split.planned.kcal).toBe(100);
  });

  it("handles a day with no meals", () => {
    expect(eatenAndPlanned([])).toMatchObject({ eaten_count: 0, meal_count: 0, totals: { kcal: 0 }, planned: { kcal: 0 } });
  });
});
