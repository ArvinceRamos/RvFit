"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthField, FormError, GoogleButton, googleAuthEnabled, OrDivider, PasswordField, SubmitButton } from "@/components/auth-form";
import { AuthCard, AuthScene } from "@/components/auth-scene";
import { authErrorMessage } from "@/lib/auth-errors";
import { confirmMismatch, passwordMismatchMessage, validateNewPassword } from "@/lib/auth-validation";
import { GUEST_DRAFT_STORAGE_KEY, storedDraftHasTarget } from "@/lib/guest-draft";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  // Set on submit: whether this browser holds targets that will be saved after confirming.
  const [submitted, setSubmitted] = useState<{ hasDraft: boolean }>();

  async function signUp(event: FormEvent<HTMLFormElement>) {
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
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setPending(false);
    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }
    setSubmitted({ hasDraft: storedDraftHasTarget(window.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY)) });
  }

  return (
    <AuthScene>
      <AuthCard label="Free account" title="Create an account">
        {submitted ? (
          <div className="mt-5 space-y-3 text-muted" role="status">
            <p className="text-ink">Check your email. We sent a confirmation link to {email}.</p>
            {submitted.hasDraft ? (
              <p className="text-sm">
                Open the link in this browser so the targets you just calculated are saved to your account.
                If you open it somewhere else, you can set up your targets again in about a minute.
              </p>
            ) : (
              <p className="text-sm">After you confirm, you will set up your calorie target from the dashboard.</p>
            )}
            <p className="text-sm">No email after a few minutes? Check your spam folder.</p>
          </div>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={signUp}>
            <AuthField autoComplete="email" label="Email" onChange={setEmail} value={email} />
            <PasswordField autoComplete="new-password" hint="At least 8 characters." label="Password" minLength={8} onChange={setPassword} value={password} />
            <PasswordField
              autoComplete="new-password"
              error={confirmMismatch(password, confirm) ? passwordMismatchMessage : undefined}
              label="Confirm password"
              onChange={setConfirm}
              value={confirm}
            />
            <FormError message={error} />
            <SubmitButton pending={pending} pendingText="Creating account…">Create account</SubmitButton>
          </form>
        )}
        {!submitted && googleAuthEnabled && (
          <>
            <OrDivider />
            <GoogleButton />
          </>
        )}
        <p className="mt-6 text-sm text-muted">Already have an account? <Link className="font-semibold underline" href="/login">Log in</Link></p>
      </AuthCard>
    </AuthScene>
  );
}
