"use server";

import { createClient } from "@/lib/supabase/server";
import { availableAllergyTags, diffAvoidedFoods, validatePreferences } from "@/lib/preferences";

export type SavePreferencesResult = { ok: true } | { ok: false; error: string };

const saveError = "Your preferences could not be saved. Please try again.";

export async function savePreferencesAction(rawPreferences: unknown): Promise<SavePreferencesResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to save preferences." };

  // Check allergy choices against the real catalog, not against what the browser sent.
  const { data: catalogTags, error: catalogError } = await supabase.from("foods").select("diet_tags");
  if (catalogError) return { ok: false, error: saveError };
  const validated = validatePreferences(rawPreferences, availableAllergyTags(catalogTags.map((food) => food.diet_tags)));
  if (!validated.ok) return validated;
  const preferences = validated.data;

  // Allergy tags are saved first so the safety filter is never left behind by a later failure.
  const { error: preferencesError } = await supabase.from("user_preferences").upsert({
    user_id: user.id,
    allergy_tags: preferences.allergy_tags,
    experience: preferences.experience,
    equipment: preferences.equipment,
    training_days: preferences.training_days,
    updated_at: new Date().toISOString(),
  });
  if (preferencesError) return { ok: false, error: saveError };

  const { data: currentAvoided, error: currentError } = await supabase
    .from("user_avoided_foods")
    .select("food_id")
    .eq("user_id", user.id);
  if (currentError) return { ok: false, error: saveError };

  const { toAdd, toRemove } = diffAvoidedFoods(
    currentAvoided.map((row) => row.food_id),
    preferences.avoided_food_ids,
  );
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("user_avoided_foods")
      .insert(toAdd.map((foodId) => ({ user_id: user.id, food_id: foodId })));
    if (error) return { ok: false, error: saveError };
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("user_avoided_foods")
      .delete()
      .eq("user_id", user.id)
      .in("food_id", toRemove);
    if (error) return { ok: false, error: saveError };
  }

  return { ok: true };
}
