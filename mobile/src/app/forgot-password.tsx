import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { authErrorMessage, expiredLinkMessage } from "@/lib/auth-errors";
import { AuthCard } from "~/components/auth-card";
import { RibbonScreen } from "~/components/ribbon-screen";
import { Alert, Button, Field, FormError, Stack, TextLink, Txt } from "~/components/ui";
import { authCallbackUrl } from "~/lib/auth-links";
import { supabase } from "~/lib/supabase";

export default function ForgotPassword() {
  // Set by auth/callback or reset-password when a reset link cannot be used.
  const { error: errorParam } = useLocalSearchParams<{ error?: string }>();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState<string>();

  async function requestReset() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authCallbackUrl("reset-password") });
      setPending(false);
      if (resetError) {
        setError(authErrorMessage(resetError.message));
        return;
      }
      setSubmitted(email.trim());
    } catch (caught) {
      setPending(false);
      setError(authErrorMessage(caught instanceof Error ? caught.message : "network"));
    }
  }

  return (
    <RibbonScreen>
      <AuthCard label="Password help" title="Reset your password">
        {submitted ? (
          // The same message whether or not an account exists, so the screen does not reveal who has one.
          <Stack gap={10}>
            <Txt>If an account exists for {submitted}, we sent a link to reset your password.</Txt>
            <Txt tone="muted" variant="small">Open the link on this phone. It can take a minute to arrive, so check your spam folder too.</Txt>
          </Stack>
        ) : (
          <>
            {errorParam === "expired" && !error ? <Alert tone="warn">{expiredLinkMessage}</Alert> : null}
            <Field autoComplete="email" keyboardType="email-address" label="Email" onChangeText={setEmail} onSubmitEditing={requestReset} returnKeyType="send" textContentType="emailAddress" value={email} />
            <FormError message={error} />
            <Button full loading={pending} loadingText="Sending…" onPress={requestReset}>Send reset email</Button>
          </>
        )}
        <Txt tone="muted" variant="small">
          Remembered it? <TextLink onPress={() => router.replace("/login")}>Log in</TextLink>
        </Txt>
      </AuthCard>
    </RibbonScreen>
  );
}
