import { describe, expect, it } from "vitest";
import { checkPlanFoods, findLabelClash, maxPlanMeals, validateMealPlan, type PlanFood } from "./meal-plan-save";
import type { ValidMeal } from "./meal";

const ids = {
  chicken: "11111111-1111-4111-8111-111111111111",
  beef: "22222222-2222-4222-8222-222222222222",
  rice: "33333333-3333-4333-8333-333333333333",
  oil: "44444444-4444-4444-8444-444444444444",
  whey: "55555555-5555-4555-8555-555555555555",
  broccoli: "66666666-6666-4666-8666-666666666666",
  sweetPotato: "88888888-8888-4888-8888-888888888888",
  oats: "99999999-9999-4999-8999-999999999999",
};

const foods: PlanFood[] = [
  { id: ids.chicken, name: "Chicken breast", role: "protein", diet_tags: ["meat"], portion_class: "meat_fish_cooked" },
  { id: ids.beef, name: "Ground beef", role: "protein", diet_tags: ["meat"], portion_class: "meat_fish_cooked" },
  { id: ids.rice, name: "Rice", role: "carb", diet_tags: [], portion_class: "grain_cooked" },
  { id: ids.sweetPotato, name: "Sweet potato", role: "carb", diet_tags: [], portion_class: "starchy_veg" },
  { id: ids.oats, name: "Oats", role: "carb", diet_tags: [], portion_class: "grain_dry" },
  { id: ids.oil, name: "Olive oil", role: "fat", diet_tags: [], portion_class: "oil" },
  { id: ids.whey, name: "Whey protein powder", role: "protein", diet_tags: ["dairy"], portion_class: "powder" },
  { id: ids.broccoli, name: "Broccoli", role: "vegetable", diet_tags: [], portion_class: null },
];
const none = { allergyTags: [], avoidedFoodIds: [] };

function meal(date: string, label: string, items: [string, number][] = [[ids.chicken, 150], [ids.rice, 250], [ids.oil, 12]]) {
  return { date, label, items: items.map(([foodId, grams]) => ({ foodId, grams })) };
}

function valid(meals: ReturnType<typeof meal>[]): ValidMeal[] {
  const result = validateMealPlan({ meals });
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

function error(raw: unknown): string {
  const result = validateMealPlan(raw);
  if (result.ok) throw new Error("Expected an error");
  return result.error;
}

describe("validateMealPlan", () => {
  it("accepts a plan and keeps only date, label, food ids, and grams", () => {
    const meals = valid([meal("2026-10-08", "Meal 1"), meal("2026-10-08", "Meal 2", [[ids.whey, 40.004]])]);
    expect(meals).toEqual([
      {
        meal_id: null,
        meal_date: "2026-10-08",
        label: "Meal 1",
        items: [
          { food_id: ids.chicken, grams: 150 },
          { food_id: ids.rice, grams: 250 },
          { food_id: ids.oil, grams: 12 },
        ],
      },
      { meal_id: null, meal_date: "2026-10-08", label: "Meal 2", items: [{ food_id: ids.whey, grams: 40 }] },
    ]);
  });

  it("never accepts a meal id, so a plan cannot edit a logged meal", () => {
    const [saved] = valid([{ ...meal("2026-10-08", "Meal 1"), mealId: ids.beef } as ReturnType<typeof meal>]);
    expect(saved.meal_id).toBeNull();
  });

  it("ignores client nutrition", () => {
    const withNutrition = { ...meal("2026-10-08", "Meal 1"), totals: { kcal: 1 } };
    const [saved] = valid([withNutrition]);
    expect(Object.keys(saved)).toEqual(["meal_id", "meal_date", "label", "items"]);
  });

  it("rejects bad shapes and plan sizes", () => {
    expect(error(null)).toBe("Plan details are invalid.");
    expect(error({ meals: "x" })).toBe("Plan details are invalid.");
    expect(error({ meals: [null] })).toBe("Plan details are invalid.");
    expect(error({ meals: [] })).toBe("The plan has no meals to save.");
    expect(maxPlanMeals).toBe(42);
    const tooMany = Array.from({ length: 43 }, (_, i) => meal(`2026-10-0${1 + Math.floor(i / 6)}`, `Meal ${(i % 6) + 1}`));
    expect(error({ meals: tooMany })).toBe("A plan can have at most 42 meals.");
  });

  it("runs each meal through validateMeal", () => {
    expect(error({ meals: [meal("2026-10-08", "Breakfast")] })).toBe("Planned meal 1: Choose a meal label from Meal 1 to Meal 6.");
    expect(error({ meals: [meal("2026-10-08", "Meal 1"), meal("2026-02-30", "Meal 1")] })).toBe(
      "Planned meal 2: Choose a valid date.",
    );
    expect(error({ meals: [meal("2026-10-08", "Meal 1", [[ids.rice, 2001]])] })).toBe(
      "Planned meal 1: Food 1: The amount can be at most 2,000 g.",
    );
    expect(error({ meals: [meal("2026-10-08", "Meal 1", [])] })).toBe("Planned meal 1: Add at least one food.");
    expect(error({ meals: [meal("2026-10-08", "Meal 1", [["not-a-uuid", 100]])] })).toBe("Planned meal 1: Meal details are invalid.");
  });

  it("allows at most six foods per meal (two per group)", () => {
    const six: [string, number][] = [[ids.chicken, 100], [ids.beef, 100], [ids.rice, 100], [ids.sweetPotato, 100], [ids.oil, 10], [ids.oats, 30]];
    expect(valid([meal("2026-10-08", "Meal 1", six)])[0].items).toHaveLength(6);
    expect(error({ meals: [meal("2026-10-08", "Meal 1", [...six, [ids.whey, 32]])] })).toBe(
      "Planned meal 1: a planned meal can have at most 6 foods.",
    );
  });

  it("allows at most seven days in one window", () => {
    expect(valid([meal("2026-10-08", "Meal 1"), meal("2026-10-14", "Meal 1")])).toHaveLength(2);
    expect(error({ meals: [meal("2026-10-08", "Meal 1"), meal("2026-10-15", "Meal 1")] })).toBe("A plan can cover at most 7 days.");
  });

  it("rejects a label used twice on the same date", () => {
    expect(valid([meal("2026-10-08", "Meal 1"), meal("2026-10-09", "Meal 1")])).toHaveLength(2);
    expect(error({ meals: [meal("2026-10-08", "Meal 2"), meal("2026-10-08", "Meal 2")] })).toBe("Meal 2 is used twice on 2026-10-08.");
  });
});

describe("checkPlanFoods", () => {
  it("accepts saved Protein, Carbs, and Fats foods", () => {
    expect(checkPlanFoods(valid([meal("2026-10-08", "Meal 1")]), foods, none)).toBeNull();
  });

  it("rejects a food that is not in the catalog", () => {
    const meals = valid([meal("2026-10-08", "Meal 1", [["77777777-7777-4777-8777-777777777777", 100]])]);
    expect(checkPlanFoods(meals, foods, none)).toBe("A food in the plan was not found. Make a new plan.");
  });

  it("rejects foods outside the three groups", () => {
    const meals = valid([meal("2026-10-08", "Meal 1", [[ids.broccoli, 100]])]);
    expect(checkPlanFoods(meals, foods, none)).toBe("Broccoli is not a Protein, Carbs, or Fats food.");
  });

  it("rejects allergy-tagged and avoided foods", () => {
    const meals = valid([meal("2026-10-08", "Meal 1", [[ids.whey, 40], [ids.rice, 200]])]);
    expect(checkPlanFoods(meals, foods, { allergyTags: ["dairy"], avoidedFoodIds: [] })).toBe(
      "Whey protein powder matches an allergy or avoided food in your preferences.",
    );
    expect(checkPlanFoods(meals, foods, { allergyTags: [], avoidedFoodIds: [ids.rice] })).toBe(
      "Rice matches an allergy or avoided food in your preferences.",
    );
  });

  it("allows a second food from a group, but not a third", () => {
    const two = valid([meal("2026-10-08", "Meal 1", [[ids.chicken, 100], [ids.rice, 320], [ids.sweetPotato, 200], [ids.oil, 14]])]);
    expect(checkPlanFoods(two, foods, none)).toBeNull();
    const three = valid([meal("2026-10-08", "Meal 1", [[ids.rice, 320], [ids.sweetPotato, 200], [ids.oats, 50]])]);
    expect(checkPlanFoods(three, foods, none)).toBe("Each planned meal can have at most 2 foods from each group.");
  });

  it("rejects the same food twice in one meal", () => {
    const meals = valid([meal("2026-10-08", "Meal 1", [[ids.rice, 100], [ids.rice, 100]])]);
    expect(checkPlanFoods(meals, foods, none)).toBe("Rice appears twice in one planned meal.");
  });

  it("keeps whey in a shake of its own", () => {
    const shake = valid([meal("2026-10-08", "Meal 4", [[ids.whey, 64]])]);
    expect(checkPlanFoods(shake, foods, none)).toBeNull();
    const mixed = valid([meal("2026-10-08", "Meal 1", [[ids.whey, 32], [ids.rice, 300], [ids.oil, 10]])]);
    expect(checkPlanFoods(mixed, foods, none)).toBe("A shake can hold only whey or other powders.");
  });

  it("rejects a food with no portion class", () => {
    const unclassed = foods.map((food) => (food.id === ids.rice ? { ...food, portion_class: null } : food));
    expect(checkPlanFoods(valid([meal("2026-10-08", "Meal 1")]), unclassed, none)).toBe("Rice cannot be planned yet.");
  });

  it("allows at most five foods from each group across the plan", () => {
    const proteins: PlanFood[] = Array.from({ length: 6 }, (_, i) => ({
      id: `aaaaaaaa-aaaa-4aaa-8aaa-00000000000${i}`,
      name: `Protein ${i}`,
      role: "protein",
      diet_tags: [],
      portion_class: "meat_fish_cooked",
    }));
    const plan = (count: number) =>
      valid(proteins.slice(0, count).map((food, i) => meal(`2026-10-0${1 + Math.floor(i / 6)}`, `Meal ${(i % 6) + 1}`, [[food.id, 100]])));
    expect(checkPlanFoods(plan(5), proteins, none)).toBeNull();
    expect(checkPlanFoods(plan(6), proteins, none)).toBe("A plan can use at most 5 foods from each group.");
  });
});

describe("findLabelClash", () => {
  const meals = valid([meal("2026-10-08", "Meal 2"), meal("2026-10-09", "Meal 1")]);

  it("finds a label already saved on the same date", () => {
    expect(findLabelClash(meals, [{ meal_date: "2026-10-09", label: "Meal 1" }])).toBe(
      "Meal 1 is already used on 2026-10-09. Nothing was saved. Make a new plan to use the free labels.",
    );
  });

  it("ignores the same label on other dates", () => {
    expect(findLabelClash(meals, [{ meal_date: "2026-10-08", label: "Meal 1" }, { meal_date: "2026-10-10", label: "Meal 2" }])).toBeNull();
  });
});
