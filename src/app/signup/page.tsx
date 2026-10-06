"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { authErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError(undefined);
    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signUpError) {
      setError(authErrorMessage(signUpError.message));
      return;
    }
    setSubmitted(true);
  }

  return (
    <AuthFrame>
      <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
      {submitted ? <p className="mt-5 text-muted">Check your email to confirm your account</p> : <form className="mt-8 space-y-5" onSubmit={signUp}>
        <label className="block text-sm font-semibold">Email<input className="mt-2 w-full rounded-lg border border-edge bg-field px-3 py-2 text-base" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label className="block text-sm font-semibold">Password<input className="mt-2 w-full rounded-lg border border-edge bg-field px-3 py-2 text-base" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        {error && <p className="rounded-lg bg-danger-bg p-3 text-sm text-danger">{error}</p>}
        <button className="w-full rounded-lg bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-soft" type="submit">Create account</button>
      </form>}
      <p className="mt-6 text-sm text-muted">Already have an account? <Link className="font-semibold underline" href="/login">Log in</Link></p>
    </AuthFrame>
  );
}
