import type { Result } from "@/lib/calc/calculate";
import { calculationConfig } from "@/lib/calc/config";
import type { FoodRole } from "@/lib/food-catalog";
import { validateMeal, type ValidMeal } from "@/lib/meal";
import { plannerGroups } from "@/lib/meal-planner";
import { isExcluded, type Exclusions } from "@/lib/suggestions";
import { addDays } from "@/lib/week";

// Server-side checks for saving a meal plan. The client sends only dates, labels, food ids, and grams;
// nutrition is never trusted. Spec: docs/MEAL-PLANNER.md "Save rules".
const limits = calculationConfig.meal_planner;
// Keep in step with the 42-meal guard in public.save_meal_plan.
export const maxPlanMeals = limits.max_days * limits.meals_per_day.max;
// One protein, carb, and fat food per meal, each with at most one second food (MP-8).
const maxItemsPerMeal = plannerGroups.length * limits.max_foods_per_group_per_meal;

export type PlanFood = { id: string; name: string; role: FoodRole; diet_tags: string[]; portion_class: string | null };

function failure(error: string): Result<never> {
  return { ok: false, error };
}

// Shape, each meal through validateMeal, and the planner limits. Plans only create new meals.
export function validateMealPlan(raw: unknown): Result<ValidMeal[]> {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as Record<string, unknown>).meals)) {
    return failure("Plan details are invalid.");
  }
  const rawMeals = (raw as { meals: unknown[] }).meals;
  if (rawMeals.length === 0) return failure("The plan has no meals to save.");
  if (rawMeals.length > maxPlanMeals) return failure(`A plan can have at most ${maxPlanMeals} meals.`);

  const meals: ValidMeal[] = [];
  for (const [index, rawMeal] of rawMeals.entries()) {
    if (!rawMeal || typeof rawMeal !== "object") return failure("Plan details are invalid.");
    const input = rawMeal as Record<string, unknown>;
    // A meal id is never accepted, so a plan cannot edit a logged meal.
    const validated = validateMeal({ mealId: null, date: input.date, label: input.label, items: input.items });
    if (!validated.ok) return failure(`Planned meal ${index + 1}: ${validated.error}`);
    if (validated.data.items.length > maxItemsPerMeal) {
      return failure(`Planned meal ${index + 1}: a planned meal can have at most ${maxItemsPerMeal} foods.`);
    }
    meals.push(validated.data);
  }

  const dates = [...new Set(meals.map((meal) => meal.meal_date))].sort();
  if (addDays(dates[0], limits.max_days - 1) < dates[dates.length - 1]) {
    return failure(`A plan can cover at most ${limits.max_days} days.`);
  }
  const seen = new Set<string>();
  for (const meal of meals) {
    const key = `${meal.meal_date} ${meal.label}`;
    if (seen.has(key)) return failure(`${meal.label} is used twice on ${meal.meal_date}.`);
    seen.add(key);
  }
  return { ok: true, data: meals };
}

// Foods as saved in the database: they must exist, be Protein, Carbs, or Fats foods with a portion class,
// at most two per group in each meal, at most the group limit across the plan, and not excluded by the
// user's preferences. A meal with a powder (whey) is a shake and holds only powders.
export function checkPlanFoods(meals: readonly ValidMeal[], foods: readonly PlanFood[], exclusions: Exclusions): string | null {
  const byId = new Map(foods.map((food) => [food.id, food]));
  const perGroup = new Map<string, Set<string>>();
  for (const meal of meals) {
    const perGroupInMeal = new Map<string, number>();
    const inMeal = new Set<string>();
    let powders = 0;
    for (const item of meal.items) {
      const food = byId.get(item.food_id);
      if (!food) return "A food in the plan was not found. Make a new plan.";
      if (!(plannerGroups as readonly string[]).includes(food.role)) return `${food.name} is not a Protein, Carbs, or Fats food.`;
      if (isExcluded(food, exclusions)) return `${food.name} matches an allergy or avoided food in your preferences.`;
      if (!food.portion_class) return `${food.name} cannot be planned yet.`;
      if (inMeal.has(food.id)) return `${food.name} appears twice in one planned meal.`;
      inMeal.add(food.id);
      if (food.portion_class === "powder") powders++;
      const inGroup = (perGroupInMeal.get(food.role) ?? 0) + 1;
      perGroupInMeal.set(food.role, inGroup);
      if (inGroup > limits.max_foods_per_group_per_meal) {
        return `Each planned meal can have at most ${limits.max_foods_per_group_per_meal} foods from each group.`;
      }
      const picked = perGroup.get(food.role) ?? new Set<string>();
      picked.add(food.id);
      perGroup.set(food.role, picked);
      if (picked.size > limits.max_foods_per_group) {
        return `A plan can use at most ${limits.max_foods_per_group} foods from each group.`;
      }
    }
    if (powders > 0 && powders < meal.items.length) return "A shake can hold only whey or other powders.";
  }
  return null;
}

export const labelClashMessage =
  "A meal label in this plan is already used on that day. Nothing was saved. Make a new plan to use the free labels.";

// Labels already saved by the user on the plan's dates. Logged meals are never changed.
export function findLabelClash(
  meals: readonly ValidMeal[],
  saved: readonly { meal_date: string; label: string }[],
): string | null {
  const taken = new Set(saved.map((meal) => `${meal.meal_date} ${meal.label}`));
  const clash = meals.find((meal) => taken.has(`${meal.meal_date} ${meal.label}`));
  if (!clash) return null;
  return `${clash.label} is already used on ${clash.meal_date}. Nothing was saved. Make a new plan to use the free labels.`;
}
