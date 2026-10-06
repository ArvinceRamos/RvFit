"use server";

import { calculationConfig } from "@/lib/calc/config";
import { createClient } from "@/lib/supabase/server";
import { addTotals, isCalendarDate, isUuid, mealTotals, validateMeal, type MealTotals } from "@/lib/meal";
import { groupMealDays, mealDaysRange, readMealDayView, type MealDay } from "@/lib/meal-days";
import { nutritionColumns, type NutritionRow } from "@/lib/meal-foods";
import {
  checkPlanFoods,
  findLabelClash,
  labelClashMessage,
  validateMealPlan,
  type PlanFood,
} from "@/lib/meal-plan-save";
import type { LoggedDay } from "@/lib/meal-planner";
import { eatenAndPlanned, itemRowsTotals, loadMeals } from "@/lib/overview-data";
import { addDays } from "@/lib/week";

export type SaveMealResult = { ok: true; mealId: string } | { ok: false; error: string };

export async function saveMealAction(rawMeal: unknown): Promise<SaveMealResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to save a meal." };

  const validated = validateMeal(rawMeal);
  if (!validated.ok) return validated;
  const meal = validated.data;

  const { data: mealId, error } = await supabase.rpc("save_meal", {
    p_meal_id: meal.meal_id,
    p_meal_date: meal.meal_date,
    p_label: meal.label,
    p_items: meal.items,
  });
  if (error?.code === "23505") {
    return { ok: false, error: `${meal.label} is already used on that date. Choose another label.` };
  }
  if (error || typeof mealId !== "string") {
    return { ok: false, error: "Your meal could not be saved. Please try again." };
  }

  return { ok: true, mealId };
}

export type SaveMealPlanResult = { ok: true; mealIds: string[] } | { ok: false; error: string };

// Saves a previewed meal plan as normal meals. Everything is checked again here, and the database
// function saves the whole plan or nothing.
export async function saveMealPlanAction(rawPlan: unknown): Promise<SaveMealPlanResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to save a meal plan." };

  const validated = validateMealPlan(rawPlan);
  if (!validated.ok) return validated;
  const meals = validated.data;

  const foodIds = [...new Set(meals.flatMap((meal) => meal.items.map((item) => item.food_id)))];
  const dates = [...new Set(meals.map((meal) => meal.meal_date))];
  const [foods, preferences, avoided, saved] = await Promise.all([
    supabase.from("foods").select("id, name, role, diet_tags, portion_class").in("id", foodIds),
    supabase.from("user_preferences").select("allergy_tags").maybeSingle(),
    supabase.from("user_avoided_foods").select("food_id"),
    supabase.from("meals").select("meal_date, label").in("meal_date", dates),
  ]);
  // If saved allergies or avoided foods cannot be read, save nothing rather than skip the check.
  if (foods.error || preferences.error || avoided.error || saved.error || !foods.data || !avoided.data || !saved.data) {
    return { ok: false, error: "Your plan could not be saved. Please try again." };
  }

  const foodError = checkPlanFoods(meals, foods.data as PlanFood[], {
    allergyTags: preferences.data?.allergy_tags ?? [],
    avoidedFoodIds: avoided.data.map((row) => row.food_id),
  });
  if (foodError) return { ok: false, error: foodError };
  const clash = findLabelClash(meals, saved.data as { meal_date: string; label: string }[]);
  if (clash) return { ok: false, error: clash };

  const { data: mealIds, error } = await supabase.rpc("save_meal_plan", {
    p_meals: meals.map(({ meal_date, label, items }) => ({ meal_date, label, items })),
  });
  // A meal saved elsewhere since the check above still hits the unique label index.
  if (error?.code === "23505") return { ok: false, error: labelClashMessage };
  if (error || !Array.isArray(mealIds) || mealIds.length !== meals.length) {
    return { ok: false, error: "Your plan could not be saved. Please try again." };
  }

  return { ok: true, mealIds: mealIds as string[] };
}

export type SetMealEatenResult = { ok: true } | { ok: false; error: string };

// Ticks a meal as eaten, or unticks it. Row-level security limits the update to the owner's meals.
export async function setMealEatenAction(mealId: unknown, eaten: unknown): Promise<SetMealEatenResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to update a meal." };
  if (!isUuid(mealId) || typeof eaten !== "boolean") return { ok: false, error: "Meal details are invalid." };

  const { data, error } = await supabase.from("meals").update({ eaten }).eq("id", mealId).select("id");
  if (error) return { ok: false, error: "The meal could not be updated. Please try again." };
  if (!data || data.length === 0) return { ok: false, error: "Meal not found." };
  return { ok: true };
}

export type DeleteMealResult = { ok: true } | { ok: false; error: string };

// Row-level security limits the delete to the owner's meals. Meal items go with the meal.
export async function deleteMealAction(mealId: unknown): Promise<DeleteMealResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to delete a meal." };
  if (!isUuid(mealId)) return { ok: false, error: "Meal details are invalid." };

  const { data, error } = await supabase.from("meals").delete().eq("id", mealId).select("id");
  if (error) return { ok: false, error: "The meal could not be deleted. Please try again." };
  if (!data || data.length === 0) return { ok: false, error: "Meal not found." };
  return { ok: true };
}

// totals: meals ticked as eaten. planned: saved but not eaten yet. usedLabels: every saved meal.
export type DayTotalsResult = { ok: true; totals: MealTotals; planned: MealTotals; usedLabels: string[] } | { ok: false };

// Totals of the user's saved meals on one date, leaving out the meal being edited
// because the builder counts that meal's current items itself.
export async function loadDayTotalsAction(date: unknown, excludeMealId: unknown): Promise<DayTotalsResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false };
  if (typeof date !== "string" || !isCalendarDate(date)) return { ok: false };
  if (excludeMealId !== null && !isUuid(excludeMealId)) return { ok: false };

  let query = supabase
    .from("meals")
    .select(`id, label, eaten, meal_items(grams, foods(${nutritionColumns}))`)
    .eq("meal_date", date);
  if (excludeMealId) query = query.neq("id", excludeMealId);
  const { data: meals, error } = await query;
  if (error || !meals) return { ok: false };

  const split = eatenAndPlanned(
    meals.map((meal) => ({
      eaten: meal.eaten as boolean,
      totals: itemRowsTotals(meal.meal_items as unknown as { grams: number | string; foods: NutritionRow }[]),
    })),
  );
  return {
    ok: true,
    usedLabels: meals.map((meal) => meal.label as string),
    totals: split.totals,
    planned: split.planned,
  };
}

export type PlanDaysResult = { ok: true; logged: Record<string, LoggedDay> } | { ok: false };

// Labels and totals of the meals already saved on each date of a plan, for the meal planner.
export async function loadPlanDaysAction(startDate: unknown, days: unknown): Promise<PlanDaysResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false };
  if (typeof startDate !== "string" || !isCalendarDate(startDate)) return { ok: false };
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > calculationConfig.meal_planner.max_days) {
    return { ok: false };
  }

  const meals = await loadMeals(supabase, startDate, addDays(startDate, days - 1));
  if (!meals) return { ok: false };
  const logged: Record<string, { labels: string[]; totals: MealTotals }> = {};
  for (const meal of meals) {
    const day = (logged[meal.meal_date] ??= { labels: [], totals: mealTotals([]) });
    day.labels.push(meal.label);
    day.totals = addTotals(day.totals, meal.totals);
  }
  return { ok: true, logged };
}

export type MealDaysResult = { ok: true; days: MealDay[] } | { ok: false };

// Meals for the Meals page tabs, grouped by day with food names and grams. "today" is the browser's local date.
export async function loadMealDaysAction(view: unknown, today: unknown): Promise<MealDaysResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false };
  if (typeof today !== "string" || !isCalendarDate(today)) return { ok: false };

  const range = mealDaysRange(readMealDayView(view), today);
  const { data, error } = await supabase
    .from("meals")
    .select(`id, label, meal_date, from_plan, eaten, created_at, meal_items(grams, foods(name, ${nutritionColumns}))`)
    .gte("meal_date", range.from)
    .lte("meal_date", range.to)
    .order("meal_date")
    .order("label")
    .order("created_at");
  if (error || !data) return { ok: false };

  const meals = data.map((meal) => {
    const items = meal.meal_items as unknown as { grams: number | string; foods: NutritionRow & { name: string } }[];
    return {
      id: meal.id as string,
      label: meal.label as string,
      meal_date: meal.meal_date as string,
      from_plan: meal.from_plan as boolean,
      eaten: meal.eaten as boolean,
      totals: itemRowsTotals(items),
      items: items.map((item) => ({ name: item.foods.name, grams: Number(item.grams) })),
    };
  });
  return { ok: true, days: groupMealDays(meals, range.newestFirst) };
}
