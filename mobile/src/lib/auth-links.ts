import * as Linking from "expo-linking";

// Where email links (sign-up confirmation, password reset) send the user back to: the app's
// auth/callback screen. In a build that is rvfit://auth/callback; in Expo Go and the web preview
// it is the development address. Each must be in the Supabase project's Redirect URLs list
// (see mobile/README.md, "Supabase settings").
export function authCallbackUrl(next?: "reset-password"): string {
  return Linking.createURL("auth/callback", next ? { queryParams: { next } } : undefined);
}
