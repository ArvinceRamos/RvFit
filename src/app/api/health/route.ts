import { connection } from "next/server";
import { logError } from "@/lib/log";

// Uptime check for a free monitor (see docs/RUNBOOK.md): 200 when the app and Supabase Auth answer,
// 503 otherwise. It reads no user data and returns no details, so it is safe to leave public.
export async function GET() {
  await connection(); // Always run at request time, never prerendered or cached.
  const headers = { "Cache-Control": "no-store" };
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) {
      logError("health.supabase", { code: String(response.status), message: "Supabase Auth health check failed" });
      return Response.json({ status: "degraded" }, { status: 503, headers });
    }
    return Response.json({ status: "ok" }, { headers });
  } catch (error) {
    logError("health.supabase", error);
    return Response.json({ status: "down" }, { status: 503, headers });
  }
}
