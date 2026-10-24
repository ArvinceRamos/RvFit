// Server-side only: it builds on ./server, which reads request cookies.
import { redirect } from "next/navigation";
import { createClient } from "./server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

// The parts of the signed-in user that pages and actions use, read from the verified token.
export type AuthUser = { id: string; email: string | undefined; user_metadata: Record<string, unknown> };

/**
 * The verified user from the session token, or null. getClaims() checks the token's signature
 * (against the project's published keys, or with Supabase Auth for older shared-secret keys) and
 * refreshes an expired session first; never trust getSession() for this.
 * A token stays valid until it expires (about an hour) even after logout elsewhere, so account
 * deletion and password changes still use getUser(), which always asks Supabase Auth.
 */
async function verifiedUser(supabase: ServerClient): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || typeof claims?.sub !== "string" || !claims.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : undefined,
    user_metadata: claims.user_metadata && typeof claims.user_metadata === "object" ? claims.user_metadata : {},
  };
}

/** For signed-in pages: the Supabase client and the verified user, or a redirect to /login. */
export async function requireUser(): Promise<{ supabase: ServerClient; user: AuthUser }> {
  const supabase = await createClient();
  const user = await verifiedUser(supabase);
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * For server actions: the client and verified user, or null so the action can return its own
 * "You must be signed in" message. Actions never take a user ID from the browser.
 */
export async function getActionUser(): Promise<{ supabase: ServerClient; user: AuthUser } | null> {
  const supabase = await createClient();
  const user = await verifiedUser(supabase);
  return user ? { supabase, user } : null;
}

/**
 * Like getActionUser, but asks Supabase Auth with getUser(), so a session that was logged out or
 * revoked elsewhere is refused at once. For actions that cannot be undone, such as account deletion.
 */
export async function getActionUserStrict(): Promise<{ supabase: ServerClient; user: AuthUser } | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user: { id: user.id, email: user.email, user_metadata: user.user_metadata ?? {} } };
}
