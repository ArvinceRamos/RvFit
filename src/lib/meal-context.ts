import { calculationConfig } from "@/lib/calc/config";
import { builderFoodColumns, toBuilderFood, type BuilderFood, type BuilderFoodRow } from "@/lib/meal-foods";
import type { DailyTargets } from "@/lib/suggestions";
import type { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/log";
import { pickRecentFoodIds } from "@/lib/recent-foods";

export type SuggestionContext =
  | { status: "ready"; target: DailyTargets | null; allergyTags: string[]; avoidedFoodIds: string[] }
  // If saved allergies or avoided foods cannot be read, show no suggestions rather than unfiltered ones.
  | { status: "error" };

// Everything the meal builder needs from the database, for the signed-in user. "Recent foods" are
// read only when asked for, and are empty when they or the avoided foods cannot be read.
export async function loadMealContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options: { recentFoods?: boolean } = {},
): Promise<{ foods: BuilderFood[]; suggestionContext: SuggestionContext; recentFoodIds: string[] }> {
  // The reads do not depend on each other, so they run in parallel.
  const [{ data: foodRows }, { data: targets, error: targetError }, { data: preferences, error: preferencesError }, { data: avoided, error: avoidedError }, recent] =
    await Promise.all([
      supabase.from("foods").select(builderFoodColumns).order("name"),
      supabase.from("calorie_targets").select("target_kcal, protein_g, carbs_g, fat_g, fiber_g").order("created_at", { ascending: false }).limit(1),
      supabase.from("user_preferences").select("allergy_tags").maybeSingle(),
      supabase.from("user_avoided_foods").select("food_id"),
      options.recentFoods
        ? supabase
            .from("meals")
            .select("meal_items(food_id)")
            .order("created_at", { ascending: false })
            .limit(calculationConfig.recent_foods.meals_scanned)
        : Promise.resolve({ data: [], error: null }),
    ]);
  const foods = ((foodRows ?? []) as BuilderFoodRow[]).map(toBuilderFood);

  if (targetError || preferencesError || avoidedError) {
    logError("mealContext.load", targetError, preferencesError, avoidedError);
    return { foods, suggestionContext: { status: "error" }, recentFoodIds: [] };
  }

  if (recent.error) logError("mealContext.recentFoods", recent.error);
  const avoidedFoodIds = (avoided ?? []).map((row) => row.food_id);
  const recentMeals = ((recent.data ?? []) as { meal_items: { food_id: string }[] }[]).map((meal) => ({
    food_ids: meal.meal_items.map((item) => item.food_id),
  }));
  const target = targets?.[0];
  return {
    foods,
    recentFoodIds: pickRecentFoodIds(recentMeals, avoidedFoodIds, calculationConfig.recent_foods.max_foods),
    suggestionContext: {
      status: "ready",
      target: target
        ? {
            kcal: Number(target.target_kcal),
            protein_g: Number(target.protein_g),
            carbs_g: Number(target.carbs_g),
            fat_g: Number(target.fat_g),
            fiber_g: Number(target.fiber_g),
          }
        : null,
      allergyTags: preferences?.allergy_tags ?? [],
      avoidedFoodIds,
    },
  };
}
