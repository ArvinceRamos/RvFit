import { describe, expect, it } from "vitest";
import { calculationConfig, type PortionClass } from "./calc/config";
import { mealTotals, type MealTotals } from "./meal";
import {
  buildMealPlan,
  pickFood,
  pickIndex,
  portionRange,
  roundPortion,
  solvePortions,
  type MealPlanInput,
  type PlannedDay,
  type PlannedItem,
  type PlannerFood,
  type PlannerGroup,
  type Rotation,
} from "./meal-planner";
import type { DailyTargets } from "./suggestions";

function food(
  id: string,
  name: string,
  role: PlannerFood["role"],
  values: [kcal: number, protein: number, carbs: number, fat: number, fiber: number | null],
  portion_class: PortionClass | null,
  portion_unit_g: number | null = null,
  diet_tags: string[] = [],
): PlannerFood {
  const [kcal, protein, carbs, fat, fiber] = values;
  return {
    id,
    name,
    role,
    diet_tags,
    portion_class,
    portion_unit_g,
    nutrition: {
      kcal_per_100g: kcal,
      protein_g_per_100g: protein,
      carbs_g_per_100g: carbs,
      fat_g_per_100g: fat,
      fiber_g_per_100g: fiber,
    },
  };
}

// Per-100 g values and portion classes from the local catalog (docs/phase2-usda-mapping.csv).
const chicken = food("chicken", "Chicken breast, roasted", "protein", [165, 31.02, 0, 3.57, 0], "meat_fish_cooked", null, ["meat"]);
const beef = food("beef", "Ground beef, 90% lean, cooked", "protein", [204, 25.21, 0, 10.68, 0], "meat_fish_cooked", null, ["meat"]);
const whey = food("whey", "Whey protein powder", "protein", [352, 78.13, 6.25, 1.56, 3.1], "powder", 32, ["dairy"]);
const rice = food("rice", "Rice, white, long-grain, cooked", "carb", [130, 2.69, 28.17, 0.28, 0.4], "grain_cooked");
const sweetPotato = food("sweet-potato", "Sweet potato, baked", "carb", [90, 2.01, 20.71, 0.15, 3.3], "starchy_veg");
const avocado = food("avocado", "Avocado, raw", "fat", [223.33, 1.81, 8.32, 20.31, null], "avocado_olive");
const oliveOil = food("olive-oil", "Olive oil", "fat", [884, 0, 0, 100, 0], "oil");

// Single-macro foods give exact, easy-to-check grams.
const pureProtein = food("pure-protein", "Pure protein", "protein", [100, 25, 0, 0, 0], "meat_fish_cooked");
const pureCarb = food("pure-carb", "Pure carb", "carb", [100, 0, 25, 0, 0], "grain_cooked");
const pureFat = food("pure-fat", "Pure fat", "fat", [900, 0, 0, 100, 0], "oil");

const targets: DailyTargets = { kcal: 2200, protein_g: 160, carbs_g: 230, fat_g: 70, fiber_g: 31 };
// The user's 2,565 kcal example (2026-10-08).
const userTargets: DailyTargets = { kcal: 2565, protein_g: 109, carbs_g: 394, fat_g: 57, fiber_g: 36 };
const userFoods = { protein: [chicken, whey], carb: [rice], fat: [oliveOil] };
const weekFoods = { protein: [chicken, beef], carb: [rice, sweetPotato], fat: [avocado, oliveOil] };
const none = { allergyTags: [], avoidedFoodIds: [] };
const mixAll: Record<PlannerGroup, Rotation> = { protein: "mix", carb: "mix", fat: "mix" };

function input(overrides: Partial<MealPlanInput<PlannerFood>> = {}): MealPlanInput<PlannerFood> {
  return {
    startDate: "2026-10-05",
    days: 1,
    mealsPerDay: 3,
    targets,
    foods: { protein: [chicken], carb: [rice], fat: [oliveOil] },
    rotations: mixAll,
    exclusions: none,
    logged: {},
    ...overrides,
  };
}

function plan(overrides: Partial<MealPlanInput<PlannerFood>> = {}): PlannedDay<PlannerFood>[] {
  const result = buildMealPlan(input(overrides));
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

function planError(overrides: Partial<MealPlanInput<PlannerFood>>): string {
  const result = buildMealPlan(input(overrides));
  if (result.ok) throw new Error("Expected an error");
  return result.error;
}

// Food ids per normal meal for one group, e.g. [["chicken", "beef", "chicken"], ...] per day.
function pattern(days: PlannedDay<PlannerFood>[], group: PlannerGroup): string[][] {
  return days.map((day) =>
    day.meals.filter((meal) => meal.kind === "meal").map((meal) => meal.items.find((item) => item.group === group)?.food.id ?? "-"),
  );
}

function allItems(days: PlannedDay<PlannerFood>[]): { kind: string; item: PlannedItem<PlannerFood> }[] {
  return days.flatMap((day) => day.meals.flatMap((meal) => meal.items.map((item) => ({ kind: meal.kind, item }))));
}

const macroKeys = ["protein_g", "carbs_g", "fat_g"] as const;
const noteWord = { protein_g: "Protein", carbs_g: "Carbs", fat_g: "Fat" } as const;

// Each macro is within 10% of the day's budget, or the day has a note about it.
function expectWithinOrNoted(day: PlannedDay<PlannerFood>) {
  for (const key of macroKeys) {
    const off = Math.abs(day.totals[key] - day.budget[key]);
    if (off > day.budget[key] * 0.1) {
      expect(day.notes.some((note) => note.startsWith(noteWord[key]))).toBe(true);
    }
  }
}

// Every item sits inside its class range on a whole step, and powders appear only in shakes.
function expectRealistic(days: PlannedDay<PlannerFood>[]) {
  for (const { kind, item } of allItems(days)) {
    const range = portionRange(item.food)!;
    expect(item.grams).toBeGreaterThanOrEqual(range.min_g);
    expect(item.grams).toBeLessThanOrEqual(range.max_g);
    expect(Number.isInteger(Math.round((item.grams / range.step_g) * 1e6) / 1e6)).toBe(true);
    expect(kind === "shake").toBe(item.food.portion_class === "powder");
  }
}

function logged(labels: string[], totals: Partial<MealTotals>) {
  return { labels, totals: { ...mealTotals([]), ...totals } };
}

describe("config placeholders", () => {
  it("holds the planner limits", () => {
    expect(calculationConfig.meal_planner.max_days).toBe(7);
    expect(calculationConfig.meal_planner.meals_per_day.max).toBe(6);
    expect(calculationConfig.meal_planner.max_foods_per_group).toBe(5);
    expect(calculationConfig.meal_planner.max_foods_per_group_per_meal).toBe(2);
  });

  it("has a sane range for each of the 15 portion classes", () => {
    const portions = Object.entries(calculationConfig.meal_planner.portions);
    expect(portions).toHaveLength(15);
    for (const [, portion] of portions) {
      if ("step_g" in portion) {
        expect(portion.min_g).toBeGreaterThan(0);
        expect(portion.max_g).toBeGreaterThan(portion.min_g);
        expect(portion.min_g % portion.step_g).toBe(0);
        expect(portion.max_g % portion.step_g).toBe(0);
      } else {
        expect(portion.min_units).toBeGreaterThanOrEqual(1);
        expect(portion.max_units).toBeGreaterThanOrEqual(portion.min_units);
      }
    }
  });
});

describe("portion ranges", () => {
  it("reads gram classes and unit classes", () => {
    expect(portionRange(rice)).toEqual({ min_g: 75, max_g: 320, step_g: 5, unit_g: null });
    expect(portionRange(oliveOil)).toEqual({ min_g: 2, max_g: 14, step_g: 1, unit_g: null });
    expect(portionRange(whey)).toEqual({ min_g: 32, max_g: 64, step_g: 32, unit_g: 32 });
    expect(portionRange({ portion_class: "egg", portion_unit_g: 50 })).toEqual({ min_g: 50, max_g: 200, step_g: 50, unit_g: 50 });
  });

  it("has no range without a class, or a unit class without a unit", () => {
    expect(portionRange({ portion_class: null, portion_unit_g: null })).toBeNull();
    expect(portionRange({ portion_class: "powder", portion_unit_g: null })).toBeNull();
  });
});

describe("bounded solver", () => {
  const pure = [pureProtein, pureCarb, pureFat];
  const solve = (budget: { protein_g: number; carbs_g: number; fat_g: number }, foods = pure) =>
    solvePortions(
      foods.map((entry) => entry.nutrition),
      foods.map((entry) => portionRange(entry)!),
      budget,
    );

  it("solves exactly when the answer is inside every range", () => {
    const grams = solve({ protein_g: 30, carbs_g: 50, fat_g: 10 });
    expect(grams[0]).toBeCloseTo(120);
    expect(grams[1]).toBeCloseTo(200);
    expect(grams[2]).toBeCloseTo(10);
  });

  it("stops at a food's largest portion", () => {
    // 150 g carbs would need 600 g; the cooked grain range ends at 320 g.
    expect(solve({ protein_g: 30, carbs_g: 150, fat_g: 10 })[1]).toBeCloseTo(320);
  });

  it("leaves a food out, or uses its smallest portion, whichever fits better", () => {
    // 5 g protein needs 20 g, below the 60 g minimum: leaving it out is closer.
    expect(solve({ protein_g: 5, carbs_g: 50, fat_g: 10 })[0]).toBe(0);
    // 12 g protein needs 48 g: the 60 g minimum (15 g protein) is closer than none.
    expect(solve({ protein_g: 12, carbs_g: 50, fat_g: 10 })[0]).toBeCloseTo(60);
  });

  it("keeps every amount at 0 or inside its range", () => {
    const foods = [chicken, beef, rice, sweetPotato, avocado, oliveOil];
    for (const budget of [
      { protein_g: 10, carbs_g: 20, fat_g: 40 },
      { protein_g: 80, carbs_g: 200, fat_g: 5 },
      { protein_g: 40, carbs_g: 70, fat_g: 20 },
    ]) {
      solve(budget, foods).forEach((grams, index) => {
        const range = portionRange(foods[index])!;
        if (grams > 0) {
          expect(grams).toBeGreaterThanOrEqual(range.min_g - 1e-6);
          expect(grams).toBeLessThanOrEqual(range.max_g + 1e-6);
        }
      });
    }
  });

  it("works with no foods", () => {
    expect(solve({ protein_g: 30, carbs_g: 50, fat_g: 10 }, [])).toEqual([]);
  });
});

describe("rounding", () => {
  it("rounds gram classes to their step, inside the range", () => {
    expect(roundPortion(portionRange(rice)!, 142.4)).toBe(140);
    expect(roundPortion(portionRange(rice)!, 142.5)).toBe(145);
    expect(roundPortion(portionRange(oliveOil)!, 7.6)).toBe(8);
    expect(roundPortion(portionRange(rice)!, 76)).toBe(75);
    expect(roundPortion(portionRange(rice)!, 0)).toBe(0);
  });

  it("rounds unit classes to whole units", () => {
    expect(roundPortion(portionRange(whey)!, 40)).toBe(32);
    expect(roundPortion(portionRange(whey)!, 50)).toBe(64);
    expect(roundPortion(portionRange(whey)!, 90)).toBe(64);
  });
});

describe("day budget and meals per day", () => {
  it("plans the full target on an empty day under Meal 1 to Meal 3", () => {
    const [day] = plan();
    expect(day.status).toBe("planned");
    expect(day.budget).toEqual({ protein_g: 160, carbs_g: 230, fat_g: 70 });
    expect(day.meals.map((meal) => meal.label)).toEqual(["Meal 1", "Meal 2", "Meal 3"]);
  });

  it("counts logged meals toward meals per day and uses the free labels", () => {
    const [day] = plan({
      logged: { "2026-10-05": logged(["Meal 1", "Meal 3"], { kcal: 900, protein_g: 60, carbs_g: 100, fat_g: 30 }) },
    });
    expect(day.remaining.kcal).toBe(1300);
    expect(day.budget).toEqual({ protein_g: 100, carbs_g: 130, fat_g: 40 });
    expect(day.meals.map((meal) => meal.label)).toEqual(["Meal 2"]);
  });

  it("counts older free-text meals too", () => {
    const [day] = plan({ logged: { "2026-10-05": logged(["Breakfast"], { kcal: 500 }) } });
    expect(day.meals.map((meal) => meal.label)).toEqual(["Meal 1", "Meal 2"]);
  });

  it("plans nothing, with a note, when the chosen number of meals is already logged", () => {
    const [day] = plan({
      mealsPerDay: 2,
      logged: { "2026-10-05": logged(["Meal 1", "Meal 2"], { kcal: 1560 }) },
    });
    expect(day.status).toBe("meals_logged");
    expect(day.meals).toEqual([]);
    expect(day.notes).toEqual(["2 meals are already logged and 640 kcal are left. Raise meals per day to plan more."]);
  });

  it("plans no meals on a day already met", () => {
    const [day] = plan({ logged: { "2026-10-05": logged(["Meal 1"], { kcal: 2200, protein_g: 100 }) } });
    expect(day.status).toBe("met");
    expect(day.meals).toEqual([]);
    expect(day.notes).toEqual([]);
  });

  it("gives no grams to a macro already over target", () => {
    const [day] = plan({
      foods: { protein: [pureProtein], carb: [pureCarb], fat: [pureFat] },
      logged: { "2026-10-05": logged(["Meal 1"], { kcal: 1000, protein_g: 180 }) },
    });
    expect(day.budget.protein_g).toBe(0);
    expect(allItems([day]).every(({ item }) => item.group !== "protein")).toBe(true);
  });

  it("only looks at logged meals on the same date", () => {
    const days = plan({ days: 2, logged: { "2026-10-06": logged(["Meal 1"], { kcal: 2200 }) } });
    expect(days.map((day) => [day.date, day.status])).toEqual([
      ["2026-10-05", "planned"],
      ["2026-10-06", "met"],
    ]);
  });

  it("splits the day budget equally across meals", () => {
    const [day] = plan({ mealsPerDay: 4 });
    for (const meal of day.meals) expect(meal.budget).toEqual({ protein_g: 40, carbs_g: 57.5, fat_g: 17.5 });
  });
});

describe("food per meal", () => {
  it("picks foods by rotation", () => {
    const foods = ["a", "b", "c"];
    expect([0, 1, 2, 3].map((meal) => pickFood(foods, "mix", 5, meal))).toEqual(["a", "b", "c", "a"]);
    expect([0, 1, 2, 3].map((day) => pickFood(foods, "alternate", day, 2))).toEqual(["a", "b", "c", "a"]);
    expect([0, 1].map((day) => pickFood(foods, "same", day, 1))).toEqual(["a", "a"]);
    expect(pickFood([], "mix", 0, 0)).toBeNull();
    expect(pickIndex(0, "same", 0, 0)).toBeNull();
  });

  it("never puts whey in a normal meal", () => {
    const [day] = plan({ foods: userFoods, targets: userTargets });
    expect(pattern([day], "protein")).toEqual([["chicken", "chicken", "chicken"]]);
  });

  it("week with Mix spreads all foods over each day's meals", () => {
    const days = plan({ days: 7, foods: weekFoods });
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-05",
      "2026-10-06",
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
      "2026-10-10",
      "2026-10-11",
    ]);
    for (const meals of pattern(days, "protein")) expect(meals).toEqual(["chicken", "beef", "chicken"]);
    days.forEach(expectWithinOrNoted);
    expectRealistic(days);
  });

  it("week with Same uses the first food every day", () => {
    const days = plan({ days: 7, foods: weekFoods, rotations: { protein: "same", carb: "same", fat: "same" } });
    for (const meals of pattern(days, "protein")) expect(meals).toEqual(["chicken", "chicken", "chicken"]);
    for (const meals of pattern(days, "fat")) expect(meals).toEqual(["avocado", "avocado", "avocado"]);
    days.forEach(expectWithinOrNoted);
  });

  it("week with Alternate uses one food per day, in turn", () => {
    const days = plan({ days: 7, foods: weekFoods, rotations: { protein: "alternate", carb: "alternate", fat: "same" } });
    expect(pattern(days, "protein").map((meals) => meals[0])).toEqual(["chicken", "beef", "chicken", "beef", "chicken", "beef", "chicken"]);
    for (const meals of pattern(days, "protein")) expect(new Set(meals).size).toBe(1);
    days.forEach(expectWithinOrNoted);
  });

  it("day plan always mixes", () => {
    const [day] = plan({
      foods: { protein: [chicken, beef], carb: [rice], fat: [oliveOil] },
      rotations: { protein: "same", carb: "alternate", fat: "same" },
    });
    expect(pattern([day], "protein")).toEqual([["chicken", "beef", "chicken"]]);
  });
});

describe("second food", () => {
  it("adds the next picked food when the first is at its largest portion and still short", () => {
    const [day] = plan({ foods: { protein: [chicken], carb: [rice, sweetPotato], fat: [oliveOil] }, targets: userTargets });
    for (const meal of day.meals) {
      const carbs = meal.items.filter((item) => item.group === "carb");
      expect(carbs).toHaveLength(2);
    }
    expect(day.meals[0].items.find((item) => item.food.id === "rice")?.grams).toBe(320);
    expectRealistic([day]);
    expect(day.notes).toEqual([]);
  });

  it("never uses more than two foods from one group in a meal", () => {
    const [day] = plan({
      foods: { protein: [chicken], carb: [rice, sweetPotato, pureCarb], fat: [oliveOil] },
      targets: { ...userTargets, carbs_g: 900, kcal: 4500 },
    });
    for (const meal of day.meals) expect(meal.items.filter((item) => item.group === "carb").length).toBeLessThanOrEqual(2);
  });

  it("does not add a second food when the first one is enough", () => {
    const [day] = plan({ foods: { protein: [chicken], carb: [rice, sweetPotato], fat: [oliveOil] } });
    for (const meal of day.meals) expect(meal.items.filter((item) => item.group === "carb")).toHaveLength(1);
  });
});

describe("whey shake", () => {
  it("tops up short protein under the next free label, in whole scoops", () => {
    const [day] = plan({ foods: { protein: [chicken, whey], carb: [rice], fat: [oliveOil] }, targets: { ...targets, protein_g: 260, kcal: 2600 } });
    const shake = day.meals.find((meal) => meal.kind === "shake")!;
    expect(shake.label).toBe("Meal 4");
    expect(shake.items.map((item) => item.food.id)).toEqual(["whey"]);
    expect([1, 2]).toContain(shake.items[0].units);
    expect(shake.items[0].grams).toBe(shake.items[0].units! * 32);
  });

  it("adds no shake when the meals already cover protein", () => {
    const [day] = plan({ foods: userFoods, targets: userTargets });
    expect(day.meals.some((meal) => meal.kind === "shake")).toBe(false);
  });

  it("plans meals without protein and a shake when whey is the only protein food", () => {
    const [day] = plan({ foods: { protein: [whey], carb: [rice], fat: [oliveOil] } });
    expect(pattern([day], "protein")).toEqual([["-", "-", "-"]]);
    const shake = day.meals.find((meal) => meal.kind === "shake")!;
    expect(shake.items[0].units).toBe(2);
    expect(day.notes).toContain("Protein is 87 g short. Add another protein food or more meals.");
  });

  it("says so when no label is free for a shake", () => {
    const [day] = plan({ mealsPerDay: 6, foods: { protein: [whey], carb: [rice], fat: [oliveOil] } });
    expect(day.meals.some((meal) => meal.kind === "shake")).toBe(false);
    expect(day.notes.some((note) => note.includes("No meal label is free for a whey shake."))).toBe(true);
  });
});

describe("the user's 2,565 kcal example (chicken, rice, olive oil, whey)", () => {
  for (const mealsPerDay of [2, 3, 4, 5, 6]) {
    it(`${mealsPerDay} meals: realistic portions, and a note for every macro more than 10% off`, () => {
      const days = plan({ foods: userFoods, targets: userTargets, mealsPerDay });
      expectRealistic(days);
      expectWithinOrNoted(days[0]);
      expect(days[0].meals.filter((meal) => meal.kind === "meal")).toHaveLength(mealsPerDay);
    });
  }

  it("2 meals: rice stays at 2 cups and the notes say what is short", () => {
    const [day] = plan({ foods: userFoods, targets: userTargets, mealsPerDay: 2 });
    expect(day.meals.map((meal) => meal.items.map((item) => `${item.food.id} ${item.grams}`))).toEqual([
      ["chicken 165", "rice 320", "olive-oil 14"],
      ["chicken 165", "rice 320", "olive-oil 14"],
    ]);
    expect(day.notes).toEqual([
      "Carbs are 214 g short. Rice, white, long-grain, cooked is at its largest portion (320 g) in every meal. Add another carb food or more meals.",
      "Fat is 15 g short. Olive oil is at its largest portion (14 g) in every meal. Add another fat food or more meals.",
    ]);
  });

  it("6 meals: chicken never goes below its smallest portion, and the note says why protein is over", () => {
    const [day] = plan({ foods: userFoods, targets: userTargets, mealsPerDay: 6 });
    expect(day.meals.every((meal) => meal.items[0].grams === 60)).toBe(true);
    expect(day.notes).toEqual(["Protein is 40 g over. Chicken breast, roasted is at its smallest portion (60 g) in every meal."]);
  });
});

describe("totals and notes", () => {
  it("adds up the rounded items", () => {
    const [day] = plan();
    for (const meal of day.meals) {
      const expected = mealTotals(meal.items.map((item) => ({ food: item.food.nutrition, grams: item.grams })));
      expect(meal.totals).toEqual(expected);
    }
    expect(day.totals.kcal).toBeCloseTo(day.meals.reduce((total, meal) => total + meal.totals.kcal, 0));
  });

  it("marks fiber incomplete when a food has no fiber value", () => {
    const [day] = plan({ foods: { protein: [chicken], carb: [rice], fat: [avocado] } });
    expect(day.totals.fiber_incomplete).toBe(true);
    expect(day.totals.fiber_g).toBeNull();
  });

  it("asks for a food when a group is empty", () => {
    const [day] = plan({ foods: { protein: [pureProtein], carb: [pureCarb], fat: [] } });
    expect(day.notes).toEqual(["Fat is 70 g short. Add a fat food."]);
  });

  it("explains an over macro by the food group that brings it", () => {
    const [day] = plan({ targets: { ...targets, fat_g: 5 }, foods: { protein: [beef], carb: [rice], fat: [oliveOil] } });
    expect(day.notes.some((note) => /^Fat is \d+ g over because your protein food has fat\.$/.test(note))).toBe(true);
  });

  it("adds no note when every macro is within 10%", () => {
    // 10 g fat per meal fits inside the oil range (up to 14 g).
    const [day] = plan({ foods: { protein: [pureProtein], carb: [pureCarb], fat: [pureFat] }, targets: { ...targets, fat_g: 30 } });
    expect(day.notes).toEqual([]);
  });
});

describe("validation", () => {
  it("rejects allergy-tagged and avoided foods", () => {
    expect(planError({ exclusions: { allergyTags: ["dairy"], avoidedFoodIds: [] }, foods: { protein: [whey], carb: [], fat: [] } })).toBe(
      "Whey protein powder matches an allergy or avoided food in your preferences.",
    );
    expect(planError({ exclusions: { allergyTags: [], avoidedFoodIds: ["rice"] } })).toBe(
      "Rice, white, long-grain, cooked matches an allergy or avoided food in your preferences.",
    );
  });

  it("rejects foods in the wrong group, duplicates, and foods with no portion class", () => {
    expect(planError({ foods: { protein: [rice], carb: [], fat: [] } })).toBe("Rice, white, long-grain, cooked is not a protein food.");
    expect(planError({ foods: { protein: [chicken, chicken], carb: [], fat: [] } })).toBe("Chicken breast, roasted is picked more than once.");
    const unclassed = { ...chicken, id: "x", portion_class: null };
    expect(planError({ foods: { protein: [unclassed], carb: [], fat: [] } })).toBe("Chicken breast, roasted cannot be planned yet.");
  });

  it("enforces the placeholder limits", () => {
    expect(planError({ days: 8 })).toBe("Plan between 1 and 7 days.");
    expect(planError({ mealsPerDay: 1 })).toBe("Choose between 2 and 6 meals per day.");
    expect(planError({ mealsPerDay: 7 })).toBe("Choose between 2 and 6 meals per day.");
    const six = [...Array(6)].map((_, i) => food(`p${i}`, `Protein ${i}`, "protein", [100, 20, 0, 0, 0], "meat_fish_cooked"));
    expect(planError({ foods: { protein: six, carb: [], fat: [] } })).toBe("Pick at most 5 protein foods.");
    expect(planError({ foods: { protein: [], carb: [], fat: [] } })).toBe("Pick at least one food.");
    expect(planError({ startDate: "2026-02-30" })).toBe("Choose a valid start date.");
    expect(planError({ rotations: { ...mixAll, fat: "random" as Rotation } })).toBe("Choose a valid rotation.");
  });
});

describe("deterministic", () => {
  it("gives the same plan for the same inputs", () => {
    const overrides = { days: 7, foods: weekFoods };
    expect(plan(overrides)).toEqual(plan(overrides));
  });
});
