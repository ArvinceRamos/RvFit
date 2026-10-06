"use server";

import { createClient } from "@/lib/supabase/server";
import { isCalendarDate, isUuid, validateMeal, type MealTotals } from "@/lib/meal";
import { nutritionColumns, type NutritionRow } from "@/lib/meal-foods";
import { itemRowsTotals } from "@/lib/overview-data";

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

export type DayTotalsResult = { ok: true; totals: MealTotals; usedLabels: string[] } | { ok: false };

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
    .select(`id, label, meal_items(grams, foods(${nutritionColumns}))`)
    .eq("meal_date", date);
  if (excludeMealId) query = query.neq("id", excludeMealId);
  const { data: meals, error } = await query;
  if (error || !meals) return { ok: false };

  const items = meals.flatMap((meal) => meal.meal_items as unknown as { grams: number | string; foods: NutritionRow }[]);
  return {
    ok: true,
    usedLabels: meals.map((meal) => meal.label as string),
    totals: itemRowsTotals(items),
  };
}
