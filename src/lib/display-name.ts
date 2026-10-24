export const maxDisplayNameLength = 40;

// Keys checked in order: our own field first, then the ones Google sign-in provides.
const nameKeys = ["display_name", "full_name", "name", "given_name"] as const;

function cleanName(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

// The name to show on Profile: only what the person (or Google) gave. Never made up from the email.
export function savedDisplayName(metadata: Record<string, unknown> | undefined): string {
  for (const key of nameKeys) {
    const name = cleanName(metadata?.[key]);
    if (name) return name;
  }
  return "";
}

// Greeting line for the Dashboard.
export function greeting(metadata: Record<string, unknown> | undefined): string {
  const first = savedDisplayName(metadata).split(" ")[0];
  return first ? `Welcome back, ${first}` : "Welcome back";
}

// Checks a typed name. Empty is allowed and clears it.
export function validateDisplayName(raw: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Enter a name." };
  const name = cleanName(raw);
  if (name.length > maxDisplayNameLength) return { ok: false, error: `Use ${maxDisplayNameLength} characters or fewer.` };
  return { ok: true, name };
}
