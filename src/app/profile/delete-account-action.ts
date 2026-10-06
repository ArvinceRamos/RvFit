"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeleteAccountResult = { ok: false; error: string };

const failed = "Your account could not be deleted. Nothing was removed. Please try again.";

// Deletes the signed-in user's account. It takes no user ID from the browser: the user is checked
// with the normal server client first, and only that user is deleted. Every user table deletes its
// rows when the account goes (profile, targets, weigh-ins, preferences, avoided foods, meals and
// items, workout logs, sets, and swaps). On success it signs out and goes to the home page.
export async function deleteAccountAction(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to delete your account." };

  let deleteError: unknown;
  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
    deleteError = error;
  } catch (error) {
    deleteError = error;
  }
  if (deleteError) return { ok: false, error: failed };

  // The account is gone, so only clear this browser's session cookies. A failure here must not hide
  // the fact that the account was deleted, so it is ignored.
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}
  redirect("/?account=deleted");
}
