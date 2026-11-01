import { createClient } from "@supabase/supabase-js";
import { connection } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError } from "@/lib/log";

// Account deletion for the mobile app (mobile/src/services/account.ts). The app has no cookies and must
// never hold the admin key, so it sends its access token as "Authorization: Bearer <token>". Like
// deleteAccountAction, the token is checked with Supabase Auth (getUser, not the token alone), so a
// session logged out or revoked elsewhere is refused, and only that user is deleted. Every user table
// removes its rows when the account goes (ON DELETE CASCADE). No user ID is ever read from the request.
export async function DELETE(request: Request) {
  await connection(); // Always run at request time, never prerendered or cached.
  const headers = { "Cache-Control": "no-store" };

  const match = /^Bearer ([A-Za-z0-9._-]+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return Response.json({ error: "unauthorized" }, { status: 401, headers });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return Response.json({ error: "failed" }, { status: 500, headers });

  const auth = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error: userError } = await auth.auth.getUser(match[1]);
  if (userError || !data.user) return Response.json({ error: "unauthorized" }, { status: 401, headers });

  let deleteError: unknown;
  try {
    const { error } = await createAdminClient().auth.admin.deleteUser(data.user.id);
    deleteError = error;
  } catch (error) {
    deleteError = error;
  }
  if (deleteError) {
    logError("account.deleteApi", deleteError);
    return Response.json({ error: "failed" }, { status: 500, headers });
  }
  return Response.json({ status: "deleted" }, { headers });
}
