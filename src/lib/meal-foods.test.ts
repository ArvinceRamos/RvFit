import { describe, expect, it } from "vitest";
import { toBuilderFood, type BuilderFoodRow } from "./meal-foods";

const row: BuilderFoodRow = {
  id: "0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11",
  name: "Chicken breast, raw",
  role: "protein",
  preparation_state: "raw",
  diet_tags: ["meat"],
  kcal_per_100g: "106.03",
  protein_g_per_100g: 22.52,
  carbs_g_per_100g: "0.00",
  fat_g_per_100g: 1.93,
  fiber_g_per_100g: null,
  food_measures: [{ label: "1 cup", grams: "140.00" }],
  portion_class: "meat_fish_raw",
  portion_unit_g: null,
};

describe("toBuilderFood", () => {
  it("turns database values into numbers", () => {
    expect(toBuilderFood(row)).toMatchObject({
      nutrition: { kcal_per_100g: 106.03, protein_g_per_100g: 22.52, carbs_g_per_100g: 0, fat_g_per_100g: 1.93 },
      measures: [{ label: "1 cup", grams: 140 }],
    });
  });

  it("keeps the diet tags", () => {
    expect(toBuilderFood(row).diet_tags).toEqual(["meat"]);
  });

  it("keeps missing fiber as null instead of 0", () => {
    expect(toBuilderFood(row).nutrition.fiber_g_per_100g).toBeNull();
  });

  it("keeps a real zero fiber as 0", () => {
    expect(toBuilderFood({ ...row, fiber_g_per_100g: "0.00" }).nutrition.fiber_g_per_100g).toBe(0);
  });

  it("keeps the portion class and turns the unit into a number", () => {
    expect(toBuilderFood(row)).toMatchObject({ portion_class: "meat_fish_raw", portion_unit_g: null });
    expect(toBuilderFood({ ...row, portion_class: "powder", portion_unit_g: "32.00" })).toMatchObject({ portion_class: "powder", portion_unit_g: 32 });
  });
});
