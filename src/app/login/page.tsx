"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthField, FormError, GoogleButton, googleAuthEnabled, OrDivider, PasswordField, SubmitButton } from "@/components/auth-form";
import { AuthCard, AuthScene } from "@/components/auth-scene";
import { authErrorMessage, oauthErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

// Set by /auth/callback when a confirmation link cannot be used.
const linkErrorMessage = "That link has expired or was already used. Log in below, or create an account again if you never confirmed your email.";

function LoginForm() {
  const router = useRouter();
  const errorParam = useSearchParams().get("error");
  const linkError = errorParam === "link";
  const oauthError = errorParam === "oauth";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(authErrorMessage(signInError.message));
      setPending(false);
      return;
    }
    // Stay pending while the dashboard loads.
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={logIn}>
      {linkError && !error && <p className="alert-warn" role="status">{linkErrorMessage}</p>}
      {oauthError && !error && <p className="alert-warn" role="status">{oauthErrorMessage}</p>}
      <AuthField autoComplete="email" label="Email" onChange={setEmail} value={email} />
      <PasswordField autoComplete="current-password" label="Password" onChange={setPassword} value={password} />
      <FormError message={error} />
      <SubmitButton pending={pending} pendingText="Logging in…">Log in</SubmitButton>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthScene>
      <AuthCard label="Welcome back" title="Log in">
        <Suspense>
          <LoginForm />
        </Suspense>
        {googleAuthEnabled && (
          <>
            <OrDivider />
            <GoogleButton />
          </>
        )}
        <p className="mt-6 text-sm text-muted"><Link className="font-semibold underline" href="/forgot-password">Forgot password?</Link></p>
        <p className="mt-3 text-sm text-muted">Need an account? <Link className="font-semibold underline" href="/signup">Create one</Link></p>
      </AuthCard>
    </AuthScene>
  );
}
