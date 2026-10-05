"use server";

import { createClient } from "@/lib/supabase/server";
import { isCalendarDate, isUuid, mealTotals, validateMeal, type MealTotals } from "@/lib/meal";
import { nutritionColumns, nutritionFromRow, type NutritionRow } from "@/lib/meal-foods";

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
  if (error || typeof mealId !== "string") {
    return { ok: false, error: "Your meal could not be saved. Please try again." };
  }

  return { ok: true, mealId };
}

export type DayTotalsResult = { ok: true; totals: MealTotals } | { ok: false };

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
    .select(`id, meal_items(grams, foods(${nutritionColumns}))`)
    .eq("meal_date", date);
  if (excludeMealId) query = query.neq("id", excludeMealId);
  const { data: meals, error } = await query;
  if (error || !meals) return { ok: false };

  // Each item belongs to one food, so PostgREST returns a single object here.
  const items = meals.flatMap((meal) => meal.meal_items as unknown as { grams: number | string; foods: NutritionRow }[]);
  return {
    ok: true,
    totals: mealTotals(items.map((item) => ({ food: nutritionFromRow(item.foods), grams: Number(item.grams) }))),
  };
}
