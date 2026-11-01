import { supabase } from "~/lib/supabase";
import { logError } from "@/lib/log";

// The mobile counterpart of the web's getActionUser(): the signed-in user's ID from the current
// session. Every write also passes row-level security, which checks the token on the server, so a
// wrong or stale ID here can never reach another user's rows.
export async function currentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) logError("auth.getSession", error);
  return data.session?.user.id ?? null;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Network failures surface as thrown TypeErrors; give them the web's plain wording. */
export function networkMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("network") || message.includes("fetch") ? "We could not reach the server. Check your connection and try again." : fallback;
}
