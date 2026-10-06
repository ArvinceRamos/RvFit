import "server-only";
import { createClient } from "@supabase/supabase-js";

// A privileged client for server code only. It bypasses row-level security, so it is used for one
// job: deleting the verified signed-in user's own account. The key never has a NEXT_PUBLIC_ name,
// is never sent to the browser, and is never logged. Importing this file from browser code fails the build.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("The server is missing its Supabase admin settings.");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
