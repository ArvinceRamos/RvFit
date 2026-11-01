import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { env } from "./env";
import { secureStorage } from "./secure-storage";

// The one Supabase client for the app. It uses the public anon key and the signed-in user's token,
// so row-level security limits every read and write to the user's own rows, exactly as on the web.
// PKCE makes email links (confirmation, password reset) return a one-time code that only this
// install can exchange, because the code verifier is kept in this device's secure storage.
export const supabase: SupabaseClient = createClient(env.supabaseUrl || "http://127.0.0.1:54321", env.supabaseAnonKey || "missing", {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Refresh the session only while the app is in the foreground, as the Supabase guide for React Native asks.
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  });
}

/**
 * The shared data loaders in ../src/lib take the web server's Supabase client type, which comes from
 * the web app's own copy of supabase-js. The API is the same, so the mobile client is passed as that type.
 */
export const sharedClient = supabase as any;
