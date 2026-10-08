"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormError, PasswordField, SubmitButton } from "@/components/auth-form";
import { AuthCard, AuthScene } from "@/components/auth-scene";
import { authErrorMessage, expiredLinkMessage } from "@/lib/auth-errors";
import { confirmMismatch, passwordMismatchMessage, validateNewPassword } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  // The reset link signs the user in. Without that session the new password cannot be saved.
  const [session, setSession] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    let active = true;
    createClient().auth.getUser().then(({ data }) => {
      if (active) setSession(data.user ? "ready" : "missing");
    });
    return () => {
      active = false;
    };
  }, []);

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const invalid = validateNewPassword(password, confirm);
    if (invalid) {
      setError(invalid);
      return;
    }
    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(authErrorMessage(updateError.message));
      setPending(false);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthScene>
      <AuthCard label="Password help" title="Choose a new password">
        {session === "checking" && <p className="mt-5 text-sm text-muted" role="status">Checking your reset link…</p>}
        {session === "missing" && (
          <div className="mt-5 space-y-4">
            <p className="alert-warn" role="alert">{expiredLinkMessage}</p>
            <Link className="btn-primary" href="/forgot-password">Request a new link</Link>
          </div>
        )}
        {session === "ready" && (
          <form className="mt-8 space-y-5" onSubmit={resetPassword}>
            <PasswordField autoComplete="new-password" hint="At least 8 characters." label="New password" minLength={8} onChange={setPassword} value={password} />
            <PasswordField
              autoComplete="new-password"
              error={confirmMismatch(password, confirm) ? passwordMismatchMessage : undefined}
              label="Confirm new password"
              onChange={setConfirm}
              value={confirm}
            />
            <FormError message={error} />
            <SubmitButton pending={pending} pendingText="Saving…">Save new password</SubmitButton>
          </form>
        )}
      </AuthCard>
    </AuthScene>
  );
}
