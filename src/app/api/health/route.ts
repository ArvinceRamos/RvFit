import { connection } from "next/server";
import { logError } from "@/lib/log";

type CheckResult = "ok" | "degraded" | "down";

// One Supabase request with the public anon key. "degraded" when it answers wrongly, "down" when it does not answer.
async function check(path: string, scope: string, isOk: (response: Response) => Promise<boolean>): Promise<CheckResult> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (await isOk(response)) return "ok";
    logError(scope, { code: String(response.status), message: `${path} check failed` });
    return "degraded";
  } catch (error) {
    logError(scope, error);
    return "down";
  }
}

// Uptime check for a free monitor (see docs/RUNBOOK.md): 200 when the app, Supabase Auth and the database
// answer, 503 otherwise. The database check calls keepalive() (migration 20261029010000_ka1_keepalive), a real
// query, so the monitor also keeps the free Supabase project from pausing. It reads no user data and returns
// no details, so it is safe to leave public. Next answers HEAD requests with this handler too.
export async function GET() {
  await connection(); // Always run at request time, never prerendered or cached.
  const headers = { "Cache-Control": "no-store" };
  const results = await Promise.all([
    check("/auth/v1/health", "health.supabase", async (response) => response.ok),
    check("/rest/v1/rpc/keepalive", "health.database", async (response) => response.ok && (await response.json()) === 1),
  ]);
  if (results.includes("down")) return Response.json({ status: "down" }, { status: 503, headers });
  if (results.includes("degraded")) return Response.json({ status: "degraded" }, { status: 503, headers });
  return Response.json({ status: "ok" }, { headers });
}
