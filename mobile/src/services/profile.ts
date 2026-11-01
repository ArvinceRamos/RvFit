import { loadCheckInData } from "@/lib/check-in-data";
import { buildCheckInTarget } from "@/lib/check-in-save";
import { buildProfileSave } from "@/lib/profile-save";
import { availableAllergyTags, diffAvoidedFoods, validatePreferences } from "@/lib/preferences";
import { calculationConfig } from "@/lib/calc/config";
import { isUuid } from "@/lib/meal";
import { loadChartWeighIns } from "@/lib/overview-data";
import type { ChartPoint } from "@/lib/progress-data";
import { isChartRangeKey, rangeStart } from "@/lib/weight-chart";
import { logError } from "@/lib/log";
import { sharedClient, supabase } from "~/lib/supabase";
import { currentUserId, type ActionResult } from "./session";

// Mobile versions of src/app/profile/actions.ts, src/app/preferences/actions.ts and src/app/progress/actions.ts.

// Saves edited details and a new calorie target in one transaction, recalculated from the details.
export async function saveProfileAndTarget(raw: unknown): Promise<ActionResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to save a target." };
  const { data: latest, error: latestError } = await supabase
    .from("body_logs")
    .select("weight_kg")
    .not("weight_kg", "is", null)
    .order("logged_at", { ascending: false })
    .limit(1);
  if (latestError) {
    logError("profile.loadLatest", latestError);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  const latestWeightKg = latest?.[0] ? Number(latest[0].weight_kg) : null;
  const built = buildProfileSave(raw, latestWeightKg);
  if (!built.ok) return built;
  const { error } = await supabase.rpc("save_profile_and_target", { p_profile: built.data.profile, p_target: built.data.target, p_body_log: built.data.body_log });
  if (error?.code === "P0002") return { ok: false, error: "Set up your first target before editing it here." };
  if (error) {
    logError("profile.saveTarget", error);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  return { ok: true };
}

export type AcceptCheckInResult = { ok: true; kcal: number } | { ok: false; error: string };

// Saves the check-in suggestion as a new target row. The suggestion is worked out again from saved
// data; the screen only says which number it showed, so a stale screen cannot save a changed number.
export async function acceptCheckIn(shownKcal: number): Promise<AcceptCheckInResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to save a target." };
  if (!Number.isInteger(shownKcal)) return { ok: false, error: "This suggestion is not valid." };
  const data = await loadCheckInData(sharedClient, Date.now());
  if (data === "error") {
    logError("profile.loadCheckIn", null);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  if (!data || data.checkIn.status !== "adjust" || data.checkIn.suggestedKcal !== shownKcal || !data.goal) {
    return { ok: false, error: "This suggestion has changed. Pull down to refresh and see the latest check-in." };
  }
  const built = buildCheckInTarget({
    fromKcal: data.current.kcal,
    toKcal: data.checkIn.suggestedKcal,
    macros: data.current.macros,
    goal: data.goal,
    pace: data.pace,
    branch: data.branch,
    observedKgPerWeek: data.checkIn.observedKgPerWeek,
    expectedKgPerWeek: data.checkIn.expectedKgPerWeek,
  });
  if (!built.ok) return built;
  const { error } = await supabase.rpc("save_profile_and_target", { p_profile: { preferred_units: data.units }, p_target: built.data, p_body_log: null });
  if (error) {
    logError("profile.acceptCheckIn", error);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  return { ok: true, kcal: built.data.target_kcal };
}

const preferencesError = "Your preferences could not be saved. Please try again.";

export async function savePreferences(rawPreferences: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to save preferences." };
  // Allergy choices are checked against the real catalog, not against what the screen sent.
  const { data: catalogTags, error: catalogError } = await supabase.from("foods").select("diet_tags");
  if (catalogError) {
    logError("preferences.loadCatalog", catalogError);
    return { ok: false, error: preferencesError };
  }
  const validated = validatePreferences(rawPreferences, availableAllergyTags(catalogTags.map((food) => food.diet_tags)));
  if (!validated.ok) return validated;
  const preferences = validated.data;

  // Allergy tags are saved first so the safety filter is never left behind by a later failure.
  const { error: preferencesSaveError } = await supabase.from("user_preferences").upsert({
    user_id: userId,
    allergy_tags: preferences.allergy_tags,
    experience: preferences.experience,
    equipment: preferences.equipment,
    training_days: preferences.training_days,
    updated_at: new Date().toISOString(),
  });
  if (preferencesSaveError) {
    logError("preferences.save", preferencesSaveError);
    return { ok: false, error: preferencesError };
  }
  const { data: currentAvoided, error: currentError } = await supabase.from("user_avoided_foods").select("food_id").eq("user_id", userId);
  if (currentError) {
    logError("preferences.loadAvoided", currentError);
    return { ok: false, error: preferencesError };
  }
  const { toAdd, toRemove } = diffAvoidedFoods(currentAvoided.map((row) => row.food_id), preferences.avoided_food_ids);
  if (toAdd.length > 0) {
    const { error } = await supabase.from("user_avoided_foods").insert(toAdd.map((foodId) => ({ user_id: userId, food_id: foodId })));
    if (error) {
      logError("preferences.addAvoided", error);
      return { ok: false, error: preferencesError };
    }
  }
  if (toRemove.length > 0) {
    const { error } = await supabase.from("user_avoided_foods").delete().eq("user_id", userId).in("food_id", toRemove);
    if (error) {
      logError("preferences.removeAvoided", error);
      return { ok: false, error: preferencesError };
    }
  }
  return { ok: true };
}

export type WeightChartResult = { ok: true; points: ChartPoint[] } | { ok: false; error: string };

export async function fetchWeightChart(range: unknown): Promise<WeightChartResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in." };
  if (!isChartRangeKey(range)) return { ok: false, error: "Choose a valid range." };
  const points = await loadChartWeighIns(sharedClient, rangeStart(range, Date.now()), calculationConfig.progress.chart_max_weigh_ins);
  if (!points) {
    logError("progress.loadChart", null);
    return { ok: false, error: "Your weight chart could not be loaded. Please try again." };
  }
  return { ok: true, points };
}

export async function deleteWeighIn(weighInId: unknown): Promise<ActionResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to delete a weigh-in." };
  if (!isUuid(weighInId)) return { ok: false, error: "Weigh-in details are invalid." };
  const { data, error } = await supabase.from("body_logs").delete().eq("id", weighInId).select("id");
  if (error) {
    logError("progress.deleteWeighIn", error);
    return { ok: false, error: "The weigh-in could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Weigh-in not found." };
  return { ok: true };
}
