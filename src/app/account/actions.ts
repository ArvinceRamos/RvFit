"use server";

import { saveInitialGuestDraft, type SaveGuestDraftResult } from "@/lib/save-guest-draft";
import { createClient } from "@/lib/supabase/server";
import { readWeighInFields, validateWeighIn } from "@/lib/weigh-in";

export async function saveGuestDraftAction(rawDraft: unknown): Promise<SaveGuestDraftResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, error: "You must be signed in to save your draft." };
  return saveInitialGuestDraft(supabase, user.id, rawDraft);
}

export type SaveWeighInResult = { ok: true } | { ok: false; error: string };

export async function saveWeighInAction(
  rawFields: unknown,
  preferredUnits: unknown,
): Promise<SaveWeighInResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to save a weigh-in." };

  if (preferredUnits !== "metric" && preferredUnits !== "imperial") {
    return { ok: false, error: "Choose metric or imperial units." };
  }
  const fields = readWeighInFields(rawFields);
  if (!fields.ok) return fields;
  const validated = validateWeighIn(fields.data, preferredUnits);
  if (!validated.ok) return validated;

  const { error } = await supabase.from("body_logs").insert({
    user_id: user.id,
    logged_at: new Date().toISOString(),
    ...validated.data,
  });
  if (error) return { ok: false, error: "Your weigh-in could not be saved. Please try again." };

  return { ok: true };
}
