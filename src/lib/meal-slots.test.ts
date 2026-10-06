import { describe, expect, it } from "vitest";
import { isMealLabel, mapItemsToSlots, mealLabels, slotForRole, takenMealLabels } from "./meal-slots";
import type { FoodRole } from "./food-catalog";

const item = (id: string, role: FoodRole | null) => ({ id, role });

describe("meal labels", () => {
  it("offers Meal 1 to Meal 6 only", () => {
    expect(mealLabels).toEqual(["Meal 1", "Meal 2", "Meal 3", "Meal 4", "Meal 5", "Meal 6"]);
    expect(isMealLabel("Meal 6")).toBe(true);
    expect(isMealLabel("Meal 7")).toBe(false);
    expect(isMealLabel("breakfast")).toBe(false);
  });

  it("lists which numbered labels are taken and ignores old labels", () => {
    expect(takenMealLabels(["Meal 3", "breakfast", "Meal 1"])).toEqual(["Meal 1", "Meal 3"]);
    expect(takenMealLabels([])).toEqual([]);
  });
});

describe("slotForRole", () => {
  it("maps roles to slots, with vegetables and fruit sharing fiber", () => {
    expect(slotForRole("protein")).toBe("protein");
    expect(slotForRole("carb")).toBe("carb");
    expect(slotForRole("fat")).toBe("fat");
    expect(slotForRole("vegetable")).toBe("fiber");
    expect(slotForRole("fruit")).toBe("fiber");
  });

  it("returns null for other and unknown roles", () => {
    expect(slotForRole("other")).toBeNull();
    expect(slotForRole(null)).toBeNull();
  });
});

describe("mapItemsToSlots", () => {
  it("puts the first item of each role in its slot and the rest in extras", () => {
    const result = mapItemsToSlots([
      item("a", "protein"),
      item("b", "protein"),
      item("c", "carb"),
      item("d", "fruit"),
      item("e", "vegetable"),
      item("f", "other"),
      item("g", null),
    ]);
    expect(result.slots.protein?.id).toBe("a");
    expect(result.slots.carb?.id).toBe("c");
    expect(result.slots.fat).toBeUndefined();
    expect(result.slots.fiber?.id).toBe("d");
    expect(result.extras.map((i) => i.id)).toEqual(["b", "e", "f", "g"]);
  });

  it("handles a meal with no items", () => {
    expect(mapItemsToSlots([])).toEqual({ slots: {}, extras: [] });
  });
});
