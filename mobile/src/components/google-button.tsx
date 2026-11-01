import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { authErrorMessage, googleNotSetUpMessage } from "@/lib/auth-errors";
import { logError } from "@/lib/log";
import { authCallbackUrl } from "~/lib/auth-links";
import { env } from "~/lib/env";
import { supabase } from "~/lib/supabase";
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
      <Button full loading={pending} loadingText="Opening Google…" onPress={continueWithGoogle} variant="secondary">Continue with Google</Button>
      <FormError message={error} />
    </Stack>
  );
}
