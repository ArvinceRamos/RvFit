"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthField, FormError, SubmitButton } from "@/components/auth-form";
import { AuthCard, AuthScene } from "@/components/auth-scene";
import { authErrorMessage, expiredLinkMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

function ForgotPasswordForm() {
  // Set by /auth/callback or /reset-password when a reset link cannot be used.
  const expired = useSearchParams().get("error") === "expired";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=reset-password`,
    });
    setPending(false);
    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    // The same message whether or not an account exists, so the page does not reveal who has one.
    return (
      <div className="mt-5 space-y-3 text-muted" role="status">
        <p>If an account exists for {email}, we sent a link to reset your password.</p>
        <p className="text-sm">Open the link in this browser. It can take a minute to arrive, so check your spam folder too.</p>
      </div>
    );
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={requestReset}>
      {expired && !error && <p className="alert-warn" role="status">{expiredLinkMessage}</p>}
      <AuthField autoComplete="email" label="Email" onChange={setEmail} value={email} />
      <FormError message={error} />
      <SubmitButton pending={pending} pendingText="Sending…">Send reset email</SubmitButton>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <AuthScene>
      <AuthCard label="Password help" title="Reset your password">
        <Suspense>
          <ForgotPasswordForm />
        </Suspense>
        <p className="mt-6 text-sm text-muted">Remembered it? <Link className="font-semibold underline" href="/login">Log in</Link></p>
      </AuthCard>
    </AuthScene>
  );
}
