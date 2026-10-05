import { describe, expect, it } from "vitest";
import { calculationConfig } from "./calc/config";
import { addTotals, mealTotals, type MealTotals, type NutritionPer100g } from "./meal";
import {
  remainingTargets,
  suggestFoodsByRole,
  type DailyTargets,
  type Remaining,
  type SuggestableFood,
} from "./suggestions";

function food(
  id: string,
  name: string,
  role: SuggestableFood["role"],
  nutrition: Partial<NutritionPer100g>,
  diet_tags: string[] = [],
): SuggestableFood {
  return {
    id,
    name,
    role,
    diet_tags,
    nutrition: {
      kcal_per_100g: 100,
      protein_g_per_100g: 0,
      carbs_g_per_100g: 0,
      fat_g_per_100g: 0,
      fiber_g_per_100g: 0,
      ...nutrition,
    },
  };
}

const none = { allergyTags: [], avoidedFoodIds: [] };
const roomForAll: Remaining = { kcal: 800, protein_g: 40, carbs_g: 80, fat_g: 20, fiber_g: 10 };

const chicken = food("chicken", "Chicken breast", "protein", { kcal_per_100g: 165, protein_g_per_100g: 31 }, ["meat"]);
const eggWhite = food("egg-white", "Egg white", "protein", { kcal_per_100g: 52, protein_g_per_100g: 10.9 }, ["egg"]);
const tofu = food("tofu", "Tofu", "protein", { kcal_per_100g: 144, protein_g_per_100g: 17 }, ["soy"]);
const rice = food("rice", "Rice", "carb", { kcal_per_100g: 130, carbs_g_per_100g: 28 });
const oats = food("oats", "Oats", "carb", { kcal_per_100g: 389, carbs_g_per_100g: 66 }, ["gluten"]);
const oil = food("oil", "Olive oil", "fat", { kcal_per_100g: 884, fat_g_per_100g: 100 });
const almonds = food("almonds", "Almonds", "fat", { kcal_per_100g: 579, fat_g_per_100g: 50 }, ["tree_nuts"]);
const catalog = [chicken, eggWhite, tofu, rice, oats, oil, almonds];

function names(result: ReturnType<typeof suggestFoodsByRole>, role: string): string[] {
  return result.find((entry) => entry.role === role)!.foods.map((ranked) => ranked.food.name);
}

describe("remainingTargets", () => {
  const targets: DailyTargets = { kcal: 2000, protein_g: 120, carbs_g: 250, fat_g: 60, fiber_g: 28 };
  const consumed: MealTotals = { kcal: 1500, protein_g: 130, carbs_g: 200, fat_g: 40, fiber_g: 20, fiber_incomplete: false };

  it("subtracts what was eaten from each target", () => {
    expect(remainingTargets(targets, consumed)).toEqual({
      kcal: 500,
      protein_g: -10,
      carbs_g: 50,
      fat_g: 20,
      fiber_g: 8,
    });
  });

  it("keeps negative remainders instead of clamping them to zero", () => {
    expect(remainingTargets(targets, consumed).protein_g).toBe(-10);
  });

  it("reports remaining fiber as null when the day's fiber is incomplete", () => {
    expect(remainingTargets(targets, { ...consumed, fiber_g: null, fiber_incomplete: true }).fiber_g).toBeNull();
  });

  it("counts an empty day as nothing eaten", () => {
    expect(remainingTargets(targets, mealTotals([]))).toEqual({
      kcal: 2000,
      protein_g: 120,
      carbs_g: 250,
      fat_g: 60,
      fiber_g: 28,
    });
  });

  it("includes saved meals and the unsaved draft together", () => {
    const saved = mealTotals([{ food: chicken.nutrition, grams: 100 }]);
    const draft = mealTotals([{ food: rice.nutrition, grams: 100 }]);
    expect(remainingTargets(targets, addTotals(saved, draft))).toMatchObject({
      kcal: 2000 - 165 - 130,
      protein_g: 120 - 31,
      carbs_g: 250 - 28,
    });
  });
});

describe("suggestFoodsByRole", () => {
  it("returns protein, carb, and fat groups in that order", () => {
    expect(suggestFoodsByRole(catalog, roomForAll, none).map((entry) => entry.role)).toEqual(["protein", "carb", "fat"]);
  });

  it("ranks by the matching macro grams per kcal, highest first", () => {
    // Egg white 10.9/52 = 0.21, chicken 31/165 = 0.19, tofu 17/144 = 0.12.
    expect(names(suggestFoodsByRole(catalog, roomForAll, none), "protein")).toEqual(["Egg white", "Chicken breast", "Tofu"]);
    // Rice 28/130 = 0.22, oats 66/389 = 0.17.
    expect(names(suggestFoodsByRole(catalog, roomForAll, none), "carb")).toEqual(["Rice", "Oats"]);
    // Olive oil 100/884 = 0.113, almonds 50/579 = 0.086.
    expect(names(suggestFoodsByRole(catalog, roomForAll, none), "fat")).toEqual(["Olive oil", "Almonds"]);
  });

  it("puts a food only in its own role's list", () => {
    const result = suggestFoodsByRole(catalog, roomForAll, none);
    for (const entry of result) {
      expect(entry.foods.every((ranked) => ranked.food.role === entry.role)).toBe(true);
    }
  });

  it("excludes foods whose diet tags match a selected allergy", () => {
    const result = suggestFoodsByRole(catalog, roomForAll, { allergyTags: ["egg", "tree_nuts"], avoidedFoodIds: [] });
    expect(names(result, "protein")).toEqual(["Chicken breast", "Tofu"]);
    expect(names(result, "fat")).toEqual(["Olive oil"]);
  });

  it("excludes foods the user chose to avoid by id", () => {
    const result = suggestFoodsByRole(catalog, roomForAll, { allergyTags: [], avoidedFoodIds: ["chicken", "rice"] });
    expect(names(result, "protein")).toEqual(["Egg white", "Tofu"]);
    expect(names(result, "carb")).toEqual(["Oats"]);
  });

  it("never judges safety by name, only by saved tags", () => {
    const untagged = food("walnut-bar", "Walnut bar", "fat", { kcal_per_100g: 500, fat_g_per_100g: 40 });
    const result = suggestFoodsByRole([untagged], roomForAll, { allergyTags: ["tree_nuts"], avoidedFoodIds: [] });
    expect(names(result, "fat")).toEqual(["Walnut bar"]);
  });

  it("omits a role whose remainder is zero or negative and marks it met", () => {
    const result = suggestFoodsByRole(catalog, { ...roomForAll, protein_g: 0, carbs_g: -12 }, none);
    expect(result.find((entry) => entry.role === "protein")).toMatchObject({ status: "met", remaining_g: 0, foods: [] });
    expect(result.find((entry) => entry.role === "carb")).toMatchObject({ status: "met", remaining_g: -12, foods: [] });
    expect(result.find((entry) => entry.role === "fat")?.status).toBe("suggestions");
  });

  it("reports none available when every eligible food is excluded", () => {
    const result = suggestFoodsByRole(catalog, roomForAll, { allergyTags: ["soy", "egg", "meat"], avoidedFoodIds: [] });
    expect(result.find((entry) => entry.role === "protein")).toMatchObject({ status: "none_available", foods: [] });
  });

  it("reports none available for a role with no foods at all", () => {
    expect(suggestFoodsByRole([chicken], roomForAll, none).find((entry) => entry.role === "carb")?.status).toBe("none_available");
  });

  it("skips foods with no calories or none of the role's macro", () => {
    const water = food("water", "Mystery water", "protein", { kcal_per_100g: 0, protein_g_per_100g: 5 });
    const noProtein = food("fluff", "Fluff", "protein", { kcal_per_100g: 200, protein_g_per_100g: 0 });
    expect(names(suggestFoodsByRole([water, noProtein, chicken], roomForAll, none), "protein")).toEqual(["Chicken breast"]);
  });

  it("limits each role to the configured number of foods", () => {
    const many = Array.from({ length: 9 }, (_, index) =>
      food(`p${index}`, `Protein ${index}`, "protein", { kcal_per_100g: 100, protein_g_per_100g: 10 + index }),
    );
    expect(calculationConfig.suggestions.foods_per_role).toBe(5);
    expect(names(suggestFoodsByRole(many, roomForAll, none), "protein")).toHaveLength(5);
    expect(names(suggestFoodsByRole(many, roomForAll, none, 2), "protein")).toEqual(["Protein 8", "Protein 7"]);
  });

  it("breaks ties by name so the order is always the same", () => {
    const a = food("a", "Alpha", "carb", { carbs_g_per_100g: 20 });
    const b = food("b", "Bravo", "carb", { carbs_g_per_100g: 20 });
    expect(names(suggestFoodsByRole([b, a], roomForAll, none), "carb")).toEqual(["Alpha", "Bravo"]);
    expect(names(suggestFoodsByRole([a, b], roomForAll, none), "carb")).toEqual(["Alpha", "Bravo"]);
  });

  it("returns the ranking value used", () => {
    const protein = suggestFoodsByRole([chicken], roomForAll, none)[0].foods[0];
    expect(protein.macro_g_per_kcal).toBeCloseTo(31 / 165, 10);
  });

  it("does not change the foods it is given", () => {
    const input = [tofu, chicken];
    suggestFoodsByRole(input, roomForAll, none);
    expect(input).toEqual([tofu, chicken]);
  });
});
