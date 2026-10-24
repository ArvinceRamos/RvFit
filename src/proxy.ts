import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Only the pages that read the session on the server, plus log in and sign up (signed-in users are sent
  // on to the Dashboard). Public pages, /api/health and static files never wait on Supabase.
  // Keep this list in step with the pages that call requireUser (checked in src/proxy.test.ts).
  matcher: [
    "/dashboard",
    "/foods",
    "/meals/:path*",
    "/preferences",
    "/profile",
    "/progress",
    "/week",
    "/workouts/:path*",
    "/login",
    "/signup",
  ],
};
