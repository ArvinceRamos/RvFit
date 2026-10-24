"use server";

import { loadCheckInData } from "@/lib/check-in-data";
import { buildCheckInTarget } from "@/lib/check-in-save";
import { buildProfileSave } from "@/lib/profile-save";
import { getActionUser } from "@/lib/supabase/auth";
import { logError } from "@/lib/log";

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

// Saves edited details and a new calorie target in one transaction. The target is recalculated here
// from the details, so a number typed or changed in the browser is never saved as is.
export async function saveProfileAndTargetAction(raw: unknown): Promise<SaveProfileResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to save a target." };
  const { supabase } = auth;

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

  const { error } = await supabase.rpc("save_profile_and_target", {
    p_profile: built.data.profile,
    p_target: built.data.target,
    p_body_log: built.data.body_log,
  });
  if (error?.code === "P0002") return { ok: false, error: "Set up your first target before editing it here." };
  if (error) {
    logError("profile.saveTarget", error);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  return { ok: true };
}

export type AcceptCheckInResult = { ok: true; kcal: number } | { ok: false; error: string };

// Saves the check-in suggestion as a new target row that keeps the goal, pace and macro split.
// The suggestion is worked out again here from saved data; the browser only says which number it showed,
// so a stale page cannot save a number the check-in no longer suggests.
export async function acceptCheckInAction(shownKcal: unknown): Promise<AcceptCheckInResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to save a target." };
  const { supabase } = auth;
  if (typeof shownKcal !== "number" || !Number.isInteger(shownKcal)) return { ok: false, error: "This suggestion is not valid." };

  const data = await loadCheckInData(supabase, Date.now());
  if (data === "error") {
    logError("profile.loadCheckIn", null);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  if (!data || data.checkIn.status !== "adjust" || data.checkIn.suggestedKcal !== shownKcal || !data.goal) {
    return { ok: false, error: "This suggestion has changed. Reload the page to see the latest check-in." };
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

  // Targets are append-only: this inserts a new current row and changes no earlier one.
  const { error } = await supabase.rpc("save_profile_and_target", {
    p_profile: { preferred_units: data.units },
    p_target: built.data,
    p_body_log: null,
  });
  if (error) {
    logError("profile.acceptCheckIn", error);
    return { ok: false, error: "Your target could not be saved. Please try again." };
  }
  return { ok: true, kcal: built.data.target_kcal };
}
