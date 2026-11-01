import { saveInitialGuestDraft, type GuestDraftRpcClient, type SaveGuestDraftResult } from "@/lib/save-guest-draft";
import { readWeighInFields, validateWeighIn } from "@/lib/weigh-in";
import { validateDisplayName } from "@/lib/display-name";
import { logError } from "@/lib/log";
import { env } from "~/lib/env";
import { supabase } from "~/lib/supabase";
import { currentUserId, type ActionResult } from "./session";

// Mobile versions of src/app/account/actions.ts, src/app/profile/name-action.ts and
// src/app/profile/delete-account-action.ts. Same checks, same messages.

export async function saveGuestDraft(rawDraft: unknown): Promise<SaveGuestDraftResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to save your draft." };
  return saveInitialGuestDraft(supabase as unknown as GuestDraftRpcClient, userId, rawDraft);
}

export async function saveWeighIn(rawFields: unknown, preferredUnits: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to save a weigh-in." };
  if (preferredUnits !== "metric" && preferredUnits !== "imperial") return { ok: false, error: "Choose metric or imperial units." };
  const fields = readWeighInFields(rawFields);
  if (!fields.ok) return fields;
  const validated = validateWeighIn(fields.data, preferredUnits);
  if (!validated.ok) return validated;

  const { error } = await supabase.from("body_logs").insert({ user_id: userId, logged_at: new Date().toISOString(), ...validated.data });
  if (error) {
    logError("account.saveWeighIn", error);
    return { ok: false, error: "Your weigh-in could not be saved. Please try again." };
  }
  return { ok: true };
}

// Saves the optional name in the user's auth metadata. Nothing is stored in our tables.
export async function saveDisplayName(raw: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be signed in to save your name." };
  const checked = validateDisplayName(raw);
  if (!checked.ok) return checked;
  const { error } = await supabase.auth.updateUser({ data: { display_name: checked.name } });
  if (error) {
    logError("profile.saveName", error);
    return { ok: false, error: "Your name could not be saved. Please try again." };
  }
  return { ok: true };
}

const deleteFailed = "Your account could not be deleted. Nothing was removed. Please try again.";

/**
 * Deletes the signed-in account through the web app's /api/account endpoint, because deleting a user
 * needs the server-only admin key, which never ships in the app. The endpoint checks the token with
 * Supabase Auth and deletes only that user. Then this phone's session is cleared.
 */
export async function deleteAccount(): Promise<ActionResult> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { ok: false, error: "You must be signed in to delete your account." };
  if (!env.webUrl) return { ok: false, error: "Account deletion is not set up in this build (EXPO_PUBLIC_WEB_URL is missing). Nothing was removed." };

  let response: Response;
  try {
    response = await fetch(`${env.webUrl}/api/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  } catch (error) {
    logError("account.delete", error);
    return { ok: false, error: "We could not reach the server. Check your connection and try again. Nothing was removed." };
  }
  if (response.status === 401) return { ok: false, error: "You must be signed in to delete your account." };
  if (!response.ok) return { ok: false, error: deleteFailed };

  // The account is gone, so only clear this phone's session. A failure here must not hide that.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}
  return { ok: true };
}
