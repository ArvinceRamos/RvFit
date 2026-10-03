"use server";

import { saveInitialGuestDraft, type SaveGuestDraftResult } from "@/lib/save-guest-draft";
import { createClient } from "@/lib/supabase/server";

export async function saveGuestDraftAction(rawDraft: unknown): Promise<SaveGuestDraftResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false, error: "You must be signed in to save your draft." };
  return saveInitialGuestDraft(supabase, user.id, rawDraft);
}
