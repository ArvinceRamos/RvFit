import { router } from "expo-router";
import { useState } from "react";
import { authErrorMessage } from "@/lib/auth-errors";
import { confirmMismatch, passwordMismatchMessage, validateNewPassword } from "@/lib/auth-validation";
import { AuthCard } from "~/components/auth-card";
import { GoogleButton, OrDivider } from "~/components/google-button";
import { RibbonScreen } from "~/components/ribbon-screen";
import { Button, Field, FormError, PasswordField, Stack, TextLink, Txt } from "~/components/ui";
import { authCallbackUrl } from "~/lib/auth-links";
import { env } from "~/lib/env";
import { storedDraft } from "~/lib/guest-draft-store";
import { supabase } from "~/lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  // Set on submit: whether this phone holds targets that will be saved after confirming.
  const [submitted, setSubmitted] = useState<{ hasDraft: boolean; email: string }>();

  async function signUp() {
    if (pending) return;
    const invalid = validateNewPassword(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: authCallbackUrl() } });
      setPending(false);
      if (signUpError) {
        setError(authErrorMessage(signUpError.message));
        return;
      }
      setSubmitted({ hasDraft: storedDraft() !== null, email: email.trim() });
    } catch (caught) {
      setPending(false);
      setError(authErrorMessage(caught instanceof Error ? caught.message : "network"));
    }
  }

  return (
    <RibbonScreen>
      <AuthCard label="Free account" title="Create an account">
        {submitted ? (
          <Stack gap={10}>
            <Txt>Check your email. We sent a confirmation link to {submitted.email}.</Txt>
            {submitted.hasDraft ? (
              <Txt tone="muted" variant="small">
                Open the link on this phone so the targets you just calculated are saved to your account. If you open it somewhere else, you can set up your targets again in about a minute.
              </Txt>
            ) : (
              <Txt tone="muted" variant="small">After you confirm, you will set up your calorie target from Today.</Txt>
            )}
            <Txt tone="muted" variant="small">No email after a few minutes? Check your spam folder.</Txt>
            <Button full onPress={() => router.replace("/login")} variant="secondary">Go to Log in</Button>
          </Stack>
        ) : (
          <>
            <Field autoComplete="email" keyboardType="email-address" label="Email" onChangeText={setEmail} returnKeyType="next" textContentType="emailAddress" value={email} />
            <PasswordField hint="At least 8 characters." label="Password" newPassword onChangeText={setPassword} value={password} />
            <PasswordField
              error={confirmMismatch(password, confirm) ? passwordMismatchMessage : undefined}
              label="Confirm password"
              newPassword
              onChangeText={setConfirm}
              onSubmitEditing={signUp}
              returnKeyType="go"
              value={confirm}
            />
            <FormError message={error} />
            <Button full loading={pending} loadingText="Creating account…" onPress={signUp}>Create account</Button>
            {env.googleAuthEnabled ? (
              <>
                <OrDivider />
                <GoogleButton />
              </>
            ) : null}
          </>
        )}
        <Txt tone="muted" variant="small">
          Already have an account? <TextLink onPress={() => router.replace("/login")}>Log in</TextLink>
        </Txt>
      </AuthCard>
    </RibbonScreen>
  );
}
