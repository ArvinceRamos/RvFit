"use server";

import { validateDisplayName } from "@/lib/display-name";
import { logError } from "@/lib/log";
import { getActionUser } from "@/lib/supabase/auth";

export type SaveNameResult = { ok: true } | { ok: false; error: string };

// Saves the optional name in the signed-in user's auth metadata. Nothing is stored in our tables.
export async function saveDisplayNameAction(raw: unknown): Promise<SaveNameResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to save your name." };
  const checked = validateDisplayName(raw);
  if (!checked.ok) return checked;

  const { error } = await auth.supabase.auth.updateUser({ data: { display_name: checked.name } });
  if (error) {
    logError("profile.saveName", error);
    return { ok: false, error: "Your name could not be saved. Please try again." };
  }
  return { ok: true };
}
