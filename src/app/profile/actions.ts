"use server";

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
