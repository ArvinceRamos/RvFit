import { describe, expect, it } from "vitest";
import { calculationConfig } from "./calc/config";
import {
  addTotals,
  describeNutrition,
  itemNutrition,
  maxMealItemGrams,
  mealTotals,
  measureToGrams,
  parseAmount,
  roundGrams,
  validateGrams,
  validateMeal,
  type NutritionPer100g,
} from "./meal";

const chicken: NutritionPer100g = {
  kcal_per_100g: 165,
  protein_g_per_100g: 31,
  carbs_g_per_100g: 0,
  fat_g_per_100g: 3.6,
  fiber_g_per_100g: 0,
};
const rice: NutritionPer100g = {
  kcal_per_100g: 130,
  protein_g_per_100g: 2.7,
  carbs_g_per_100g: 28,
  fat_g_per_100g: 0.3,
  fiber_g_per_100g: 0.4,
};
const noFiber: NutritionPer100g = { ...chicken, fiber_g_per_100g: null };

const foodId = "0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11";
const mealId = "7c1d2a90-3a4b-4c55-8e66-1a2b3c4d5e6f";
const validMeal = { mealId: null, date: "2026-10-06", label: "Lunch", items: [{ foodId, grams: 150 }] };

describe("itemNutrition", () => {
  it("scales per-100 g values by the grams", () => {
    expect(itemNutrition(chicken, 150)).toEqual({
      kcal: 247.5,
      protein_g: 46.5,
      carbs_g: 0,
      fat_g: 5.4,
      fiber_g: 0,
    });
  });

  it("keeps missing fiber as null, not zero", () => {
    expect(itemNutrition(noFiber, 100).fiber_g).toBeNull();
  });

  it("keeps full precision instead of rounding", () => {
    expect(itemNutrition(rice, 33.33).protein_g).toBeCloseTo(0.89991, 5);
  });
});

describe("mealTotals", () => {
  it("sums every item", () => {
    const totals = mealTotals([
      { food: chicken, grams: 150 },
      { food: rice, grams: 200 },
    ]);
    expect(totals.kcal).toBeCloseTo(507.5, 6);
    expect(totals.protein_g).toBeCloseTo(51.9, 6);
    expect(totals.carbs_g).toBeCloseTo(56, 6);
    expect(totals.fat_g).toBeCloseTo(6, 6);
    expect(totals.fiber_g).toBeCloseTo(0.8, 6);
    expect(totals.fiber_incomplete).toBe(false);
  });

  it("reports fiber as incomplete when any item has no fiber value", () => {
    const totals = mealTotals([
      { food: rice, grams: 200 },
      { food: noFiber, grams: 100 },
    ]);
    expect(totals.fiber_g).toBeNull();
    expect(totals.fiber_incomplete).toBe(true);
    expect(totals.kcal).toBeCloseTo(425, 6);
  });

  it("treats a real zero fiber as a known value", () => {
    expect(mealTotals([{ food: chicken, grams: 100 }])).toMatchObject({ fiber_g: 0, fiber_incomplete: false });
  });

  it("returns zero totals for an empty meal", () => {
    expect(mealTotals([])).toEqual({
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
      fiber_incomplete: false,
    });
  });
});

describe("measures and amounts", () => {
  it("converts a common measure to grams", () => {
    expect(measureToGrams(140, 2)).toBe(280);
    expect(measureToGrams(86, 0.5)).toBe(43);
  });

  it("rounds grams to two decimals", () => {
    expect(roundGrams(10.126)).toBe(10.13);
  });

  it("reads typed amounts", () => {
    expect(parseAmount(" 12.5 ")).toBe(12.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("validateGrams", () => {
  it("uses the configured placeholder maximum of 2,000 g", () => {
    expect(maxMealItemGrams).toBe(calculationConfig.meal_limits.max_item_grams);
    expect(maxMealItemGrams).toBe(2000);
  });

  it("accepts an amount at the maximum", () => {
    expect(validateGrams(2000)).toEqual({ ok: true, data: 2000 });
  });

  it("rejects an amount above the maximum instead of clamping it", () => {
    expect(validateGrams(2000.01)).toEqual({ ok: false, error: "The amount can be at most 2,000 g." });
  });

  it("rejects zero, negative, and tiny amounts that round to zero", () => {
    for (const grams of [0, -5, 0.004]) {
      expect(validateGrams(grams)).toEqual({ ok: false, error: "The amount must be more than 0 g." });
    }
  });

  it("rejects amounts that are not finite numbers", () => {
    expect(validateGrams(Number.NaN).ok).toBe(false);
    expect(validateGrams(Number.POSITIVE_INFINITY).ok).toBe(false);
  });
});

describe("validateMeal", () => {
  it("accepts a valid new meal", () => {
    expect(validateMeal(validMeal)).toEqual({
      ok: true,
      data: { meal_id: null, meal_date: "2026-10-06", label: "Lunch", items: [{ food_id: foodId, grams: 150 }] },
    });
  });

  it("accepts an existing meal id and trims the label", () => {
    expect(validateMeal({ ...validMeal, mealId, label: "  Dinner  " })).toMatchObject({
      ok: true,
      data: { meal_id: mealId, label: "Dinner" },
    });
  });

  it("rounds item grams to two decimals", () => {
    expect(validateMeal({ ...validMeal, items: [{ foodId, grams: 10.126 }] })).toMatchObject({
      ok: true,
      data: { items: [{ food_id: foodId, grams: 10.13 }] },
    });
  });

  it("rejects an item above the maximum and names which item", () => {
    expect(validateMeal({ ...validMeal, items: [{ foodId, grams: 100 }, { foodId, grams: 2500 }] })).toEqual({
      ok: false,
      error: "Food 2: The amount can be at most 2,000 g.",
    });
  });

  it("rejects a meal with no foods", () => {
    expect(validateMeal({ ...validMeal, items: [] })).toEqual({ ok: false, error: "Add at least one food." });
  });

  it("rejects a blank or too-long label", () => {
    expect(validateMeal({ ...validMeal, label: "   " })).toMatchObject({ ok: false });
    expect(validateMeal({ ...validMeal, label: "a".repeat(101) })).toMatchObject({ ok: false });
  });

  it("accepts a 100 character label", () => {
    expect(validateMeal({ ...validMeal, label: "a".repeat(100) }).ok).toBe(true);
  });

  it("rejects dates that are not real calendar dates", () => {
    for (const date of ["2026-02-30", "2026-13-01", "10/06/2026", "", 20261006]) {
      expect(validateMeal({ ...validMeal, date })).toMatchObject({ ok: false });
    }
  });

  it("accepts a leap day", () => {
    expect(validateMeal({ ...validMeal, date: "2028-02-29" }).ok).toBe(true);
  });

  it("rejects bad ids and wrong field types", () => {
    expect(validateMeal({ ...validMeal, mealId: "abc" })).toMatchObject({ ok: false });
    expect(validateMeal({ ...validMeal, items: [{ foodId: "chicken", grams: 100 }] })).toMatchObject({ ok: false });
    expect(validateMeal({ ...validMeal, items: [{ foodId, grams: "100" }] })).toMatchObject({ ok: false });
    expect(validateMeal({ ...validMeal, items: [null] })).toMatchObject({ ok: false });
    expect(validateMeal({ ...validMeal, items: "none" })).toMatchObject({ ok: false });
    expect(validateMeal(null)).toMatchObject({ ok: false });
  });
});

describe("addTotals", () => {
  const a = mealTotals([{ food: chicken, grams: 100 }]);
  const b = mealTotals([{ food: rice, grams: 100 }]);
  const unknownFiber = mealTotals([{ food: noFiber, grams: 100 }]);

  it("adds each value", () => {
    expect(addTotals(a, b)).toMatchObject({ kcal: 295, protein_g: 33.7, carbs_g: 28, fiber_incomplete: false });
    expect(addTotals(a, b).fiber_g).toBeCloseTo(0.4, 10);
  });

  it("keeps fiber incomplete when either side is incomplete", () => {
    expect(addTotals(a, unknownFiber)).toMatchObject({ fiber_g: null, fiber_incomplete: true });
    expect(addTotals(unknownFiber, b)).toMatchObject({ fiber_g: null, fiber_incomplete: true });
  });

  it("treats an empty meal as nothing added", () => {
    expect(addTotals(a, mealTotals([]))).toEqual(a);
  });
});

describe("describeNutrition", () => {
  it("rounds only for display and shows missing fiber as not listed", () => {
    expect(describeNutrition(itemNutrition(noFiber, 150))).toBe(
      "248 kcal · Protein 46.5 g · Carbs 0.0 g · Fat 5.4 g · Fiber Not listed",
    );
  });
});
