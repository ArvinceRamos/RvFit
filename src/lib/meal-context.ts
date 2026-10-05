import { builderFoodColumns, toBuilderFood, type BuilderFood, type BuilderFoodRow } from "@/lib/meal-foods";
import type { DailyTargets } from "@/lib/suggestions";
import type { createClient } from "@/lib/supabase/server";

export type SuggestionContext =
  | { status: "ready"; target: DailyTargets | null; allergyTags: string[]; avoidedFoodIds: string[] }
  // If saved allergies or avoided foods cannot be read, show no suggestions rather than unfiltered ones.
  | { status: "error" };

// Everything the meal builder needs from the database, for the signed-in user.
export async function loadMealContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<{ foods: BuilderFood[]; suggestionContext: SuggestionContext }> {
  const { data: foodRows } = await supabase.from("foods").select(builderFoodColumns).order("name");
  const foods = ((foodRows ?? []) as BuilderFoodRow[]).map(toBuilderFood);

  const { data: targets, error: targetError } = await supabase
    .from("calorie_targets")
    .select("target_kcal, protein_g, carbs_g, fat_g, fiber_g")
    .order("created_at", { ascending: false })
    .limit(1);
  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("allergy_tags")
    .maybeSingle();
  const { data: avoided, error: avoidedError } = await supabase.from("user_avoided_foods").select("food_id");

  if (targetError || preferencesError || avoidedError) return { foods, suggestionContext: { status: "error" } };

  const target = targets?.[0];
  return {
    foods,
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
      avoidedFoodIds: (avoided ?? []).map((row) => row.food_id),
    },
  };
}
