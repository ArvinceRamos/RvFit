"use server";

import { buildProfileSave } from "@/lib/profile-save";
import { createClient } from "@/lib/supabase/server";

export type SaveProfileResult = { ok: true } | { ok: false; error: string };

// Saves edited details and a new calorie target in one transaction. The target is recalculated here
// from the details, so a number typed or changed in the browser is never saved as is.
export async function saveProfileAndTargetAction(raw: unknown): Promise<SaveProfileResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to save a target." };

  const { data: latest, error: latestError } = await supabase
    .from("body_logs")
    .select("weight_kg")
    .not("weight_kg", "is", null)
    .order("logged_at", { ascending: false })
    .limit(1);
  if (latestError) return { ok: false, error: "Your target could not be saved. Please try again." };
  const latestWeightKg = latest?.[0] ? Number(latest[0].weight_kg) : null;

  const built = buildProfileSave(raw, latestWeightKg);
  if (!built.ok) return built;

  const { error } = await supabase.rpc("save_profile_and_target", {
    p_profile: built.data.profile,
    p_target: built.data.target,
    p_body_log: built.data.body_log,
  });
  if (error?.code === "P0002") return { ok: false, error: "Set up your first target before editing it here." };
  if (error) return { ok: false, error: "Your target could not be saved. Please try again." };
  return { ok: true };
}
