// Server-side error log. On Vercel, console output becomes the function logs, so these lines can be
// searched by scope or error code when a user reports a problem.
// Only the error's name, code and message are logged. Never log tokens, emails, request bodies or
// Supabase "details" (which can contain row values).

type LoggedError = { name?: string; code?: string; message: string };

export function describeError(error: unknown): LoggedError {
  if (error instanceof Error) return { name: error.name, message: error.message.slice(0, 300) };
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return {
      ...(typeof code === "string" ? { code } : {}),
      message: typeof message === "string" ? message.slice(0, 300) : "Unknown error object",
    };
  }
  return { message: String(error).slice(0, 300) };
}

// Logs the first real error among those passed. scope names where it happened, for example "meals.save".
export function logError(scope: string, ...errors: unknown[]): void {
  const error = errors.find((candidate) => candidate !== null && candidate !== undefined && candidate !== false);
  console.error(JSON.stringify({ level: "error", scope, ...(error === undefined ? { message: "No error details" } : describeError(error)) }));
}
