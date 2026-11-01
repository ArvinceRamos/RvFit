import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";
import { AuthCard } from "~/components/auth-card";
import { GoogleButton } from "~/components/google-button";
import { Screen } from "~/components/screen";
import { Alert, Button, Field, FormError, PasswordField, Stack, TextLink, Txt } from "~/components/ui";
import { env } from "~/lib/env";
import { supabase } from "~/lib/supabase";

// Set by auth/callback when a confirmation link cannot be used.
const linkErrorMessage = "That link has expired or was already used. Log in below, or create an account again if you never confirmed your email.";

export default function Login() {
  const { error: errorParam } = useLocalSearchParams<{ error?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function logIn() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) {
        setError(authErrorMessage(signInError.message));
        setPending(false);
        return;
      }
      // The signed-in guard swaps the screens; Today saves any guest draft from this phone.
      router.replace("/today");
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : "network"));
      setPending(false);
    }
  }

  return (
    <Screen>
      <AuthCard label="Welcome back" title="Log in">
        {errorParam === "link" && !error ? <Alert tone="warn">{linkErrorMessage}</Alert> : null}
        {errorParam === "oauth" && !error ? <Alert tone="warn">{oauthErrorMessage}</Alert> : null}
        <Field autoComplete="email" keyboardType="email-address" label="Email" onChangeText={setEmail} returnKeyType="next" textContentType="emailAddress" value={email} />
        <PasswordField label="Password" onChangeText={setPassword} onSubmitEditing={logIn} returnKeyType="go" value={password} />
        <FormError message={error} />
        <Button full loading={pending} loadingText="Logging in…" onPress={logIn}>Log in</Button>
        {env.googleAuthEnabled ? <GoogleButton /> : null}
        <Stack gap={0}>
          <TextLink onPress={() => router.push("/forgot-password")}>Forgot password?</TextLink>
          <Txt tone="muted" variant="small">
            Need an account? <TextLink onPress={() => router.replace("/signup")}>Create one</TextLink>
          </Txt>
        </Stack>
      </AuthCard>
    </Screen>
  );
}
