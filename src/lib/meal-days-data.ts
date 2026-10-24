// Meals page data, read on the server when the page renders. The meal builder also reads day totals
// through loadDayTotalsAction, because its date can change in the browser.
import { groupMealDays, mealDaysRange, type MealDay, type MealDayView } from "@/lib/meal-days";
import { nutritionColumns, type NutritionRow } from "@/lib/meal-foods";
import type { MealTotals } from "@/lib/meal";
import { mealsToCopy } from "@/lib/meal-slots";
import { eatenAndPlanned, itemRowsTotals } from "@/lib/overview-data";
import type { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/week";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
type CopyMeal = { meal_items: { food_id: string; grams: number | string }[] };

// totals: meals ticked as eaten. planned: saved but not eaten yet. usedLabels: every saved meal.
export type DayTotalsResult = { ok: true; totals: MealTotals; planned: MealTotals; usedLabels: string[] } | { ok: false };

// Totals of the user's saved meals on one date, leaving out the meal being edited
// because the builder counts that meal's current items itself.
export async function loadDayTotals(supabase: ServerClient, date: string, excludeMealId: string | null): Promise<DayTotalsResult> {
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

// yesterdayToCopy is only counted for the Today view, for "Copy yesterday": yesterday's meals that are
// not on today yet (see mealsToCopy).
export type MealDaysResult = { ok: true; days: MealDay[]; yesterdayToCopy: number } | { ok: false };

// Meals for the Meals page tabs, grouped by day with food names and grams. today is the user's calendar date.
export async function loadMealDays(supabase: ServerClient, dayView: MealDayView, today: string): Promise<MealDaysResult> {
  const range = mealDaysRange(dayView, today);
  const [{ data, error }, yesterday] = await Promise.all([
    supabase
      .from("meals")
      .select(`id, label, meal_date, from_plan, eaten, created_at, meal_items(food_id, grams, foods(name, ${nutritionColumns}))`)
      .gte("meal_date", range.from)
      .lte("meal_date", range.to)
      .order("meal_date")
      .order("label")
      .order("created_at"),
    dayView === "today"
      ? supabase.from("meals").select("meal_items(food_id, grams)").eq("meal_date", addDays(today, -1))
      : Promise.resolve({ data: [], error: null }),
  ]);
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
  // If yesterday cannot be read, the page just leaves out "Copy yesterday". In the Today view, data is today's meals.
  const yesterdayToCopy = yesterday.error || !yesterday.data ? 0 : mealsToCopy(yesterday.data as CopyMeal[], data as unknown as CopyMeal[]).length;
  return { ok: true, days: groupMealDays(meals, range.newestFirst), yesterdayToCopy };
}
