// Server-side only: it builds on ./server, which reads request cookies.
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "./server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * For signed-in pages: the Supabase client and the verified user, or a redirect to /login.
 * getUser() checks the token with Supabase; never trust getSession() for this.
 */
export async function requireUser(): Promise<{ supabase: ServerClient; user: User }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * For server actions: the client and verified user, or null so the action can return its own
 * "You must be signed in" message. Actions never take a user ID from the browser.
 */
export async function getActionUser(): Promise<{ supabase: ServerClient; user: User } | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}
