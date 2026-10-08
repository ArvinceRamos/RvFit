import type { Instrumentation } from "next";
import { describeError } from "@/lib/log";

const REQUIRED_ENV = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;

// Runs once when a server instance starts. A missing Supabase setting would otherwise fail later
// with an unclear error on the first request, so name it in the logs straight away.
export function register() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(JSON.stringify({ level: "error", scope: "startup", message: `Missing environment variables: ${missing.join(", ")}` }));
  }
}

// Every uncaught server error (pages, route handlers, server actions, proxy) is logged as one JSON line.
// The digest matches the one shown on the error page, so a user's report can be found in the logs.
// Only the path is logged: no headers, cookies or query values.
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  console.error(
    JSON.stringify({
      level: "error",
      scope: "request",
      digest,
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      ...describeError(error),
    }),
  );
};
