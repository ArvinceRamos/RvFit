import { router } from "expo-router";
import { useState } from "react";
import { authErrorMessage, expiredLinkMessage } from "@/lib/auth-errors";
import { confirmMismatch, passwordMismatchMessage, validateNewPassword } from "@/lib/auth-validation";
import { AuthCard } from "~/components/auth-card";
import { RibbonScreen } from "~/components/ribbon-screen";
import { Alert, Button, FormError, PasswordField } from "~/components/ui";
import { useAuth } from "~/lib/auth";
import { supabase } from "~/lib/supabase";

// The reset link signs the user in (auth/callback). Without that session the new password cannot be saved.
export default function ResetPassword() {
  const { session, setRecovering } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function resetPassword() {
    if (pending) return;
    const invalid = validateNewPassword(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(authErrorMessage(updateError.message));
        setPending(false);
        return;
      }
      setRecovering(false);
      router.replace("/today");
    } catch (caught) {
      setPending(false);
      setError(authErrorMessage(caught instanceof Error ? caught.message : "network"));
    }
  }

  return (
    <RibbonScreen>
      <AuthCard label="Password help" title="Choose a new password">
        {!session ? (
          <>
            <Alert tone="warn">{expiredLinkMessage}</Alert>
            <Button onPress={() => router.replace("/forgot-password")}>Request a new link</Button>
          </>
        ) : (
          <>
            <PasswordField hint="At least 8 characters." label="New password" newPassword onChangeText={setPassword} value={password} />
            <PasswordField
              error={confirmMismatch(password, confirm) ? passwordMismatchMessage : undefined}
              label="Confirm new password"
              newPassword
              onChangeText={setConfirm}
              onSubmitEditing={resetPassword}
              returnKeyType="go"
              value={confirm}
            />
            <FormError message={error} />
            <Button full loading={pending} loadingText="Saving…" onPress={resetPassword}>Save new password</Button>
          </>
        )}
      </AuthCard>
    </RibbonScreen>
  );
}
