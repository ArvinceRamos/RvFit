"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActionUserStrict } from "@/lib/supabase/auth";
import { logError } from "@/lib/log";

export type DeleteAccountResult = { ok: false; error: string };

const failed = "Your account could not be deleted. Nothing was removed. Please try again.";

// Deletes the signed-in user's account. It takes no user ID from the browser: the user is checked
// with Supabase Auth first (getUser, not the token alone), and only that user is deleted. Every user table deletes its
// rows when the account goes (profile, targets, weigh-ins, preferences, avoided foods, meals and
// items, workout logs, sets, swaps, daily steps and sleep, and other activity). On success it signs out and goes to the home page.
export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const auth = await getActionUserStrict();
  if (!auth) return { ok: false, error: "You must be signed in to delete your account." };
  const { supabase, user } = auth;

  let deleteError: unknown;
  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    deleteError = error;
  } catch (error) {
    deleteError = error;
  }
  if (deleteError) {
    logError("account.delete", deleteError);
    return { ok: false, error: failed };
  }

  // The account is gone, so only clear this browser's session cookies. A failure here must not hide
  // the fact that the account was deleted, so it is ignored.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}
  redirect("/?account=deleted");
}
