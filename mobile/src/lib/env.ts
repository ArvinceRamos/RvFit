// Public settings, read once from EXPO_PUBLIC_ variables (see mobile/.env.example).
// Expo inlines these at build time, so each must be read by its full name.

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const webUrl = (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/+$/, "");

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  webUrl,
  googleAuthEnabled: process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED === "true",
};

/** A plain message for the screen shown when the app was built without its settings. */
export function missingEnv(): string | null {
  const missing = [
    !supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);
  return missing.length > 0 ? `The app is missing ${missing.join(" and ")}. Copy mobile/.env.example to mobile/.env.local.` : null;
}
