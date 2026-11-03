import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { authErrorMessage, googleNotSetUpMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/log";
import { authCallbackUrl } from "~/lib/auth-links";
import { env } from "~/lib/env";
import { supabase } from "~/lib/supabase";
import { useTheme } from "~/theme/theme";
import { fonts } from "~/theme/tokens";
import { Button, FormError, Stack } from "./ui";

// Asks Supabase Auth whether Google is turned on, so a missing setup shows a friendly message
// instead of the provider's raw error page (as the web GoogleButton does).
async function googleIsEnabled(): Promise<boolean> {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/settings`, { headers: { apikey: env.supabaseAnonKey } });
  if (!response.ok) return false;
  const settings = (await response.json()) as { external?: { google?: boolean } };
  return settings.external?.google === true;
}

/**
 * "Continue with Google", shown only when EXPO_PUBLIC_GOOGLE_AUTH_ENABLED is "true". Google opens in the
 * system's secure browser sheet and returns to the app with a one-time code, exchanged here for a session.
 */
export function GoogleButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function continueWithGoogle() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      if (!(await googleIsEnabled())) {
        setError(googleNotSetUpMessage);
        return;
      }
      const redirectTo = authCallbackUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
      if (oauthError || !data.url) {
        setError(authErrorMessage(oauthError?.message ?? "unsupported provider"));
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== "success") return; // Cancelled: nothing to say.
      const code = new URL(result.url).searchParams.get("code");
      if (!code) {
        router.replace("/login?error=oauth");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        logError("auth.googleExchange", exchangeError);
        setError(authErrorMessage(exchangeError.message));
      }
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : "Failed to fetch"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Stack gap={10}>
      <Button full leading={<GoogleMark />} loading={pending} loadingText="Opening Google…" onPress={continueWithGoogle} variant="secondary">Continue with Google</Button>
      <FormError message={error} />
    </Stack>
  );
}

/** "or" between the email form and the Google button, as on the web. */
export function OrDivider() {
  const { colors } = useTheme();
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: colors.muted }}>or</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
    </View>
  );
}

// The Google "G" in its brand colours, as Google's sign-in branding asks (the same paths as the web).
function GoogleMark() {
  return (
    <Svg accessibilityElementsHidden height={18} importantForAccessibility="no-hide-descendants" viewBox="0 0 48 48" width={18}>
      <Path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" fill="#EA4335" />
      <Path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" fill="#4285F4" />
      <Path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" fill="#FBBC05" />
      <Path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" fill="#34A853" />
    </Svg>
  );
}
