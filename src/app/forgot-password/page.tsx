"use client";

import { FormEvent, useState } from "react";
import { AuthFrame } from "@/components/auth-frame";
import { authErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=reset-password`,
    });
    if (resetError) {
      setError(authErrorMessage(resetError.message));
      return;
    }
    setSubmitted(true);
  }

  return <AuthFrame><h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>{submitted ? <p className="mt-5 text-zinc-700">Check your email to confirm your account</p> : <form className="mt-8 space-y-5" onSubmit={requestReset}><label className="block text-sm font-semibold">Email<input className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button className="w-full rounded-lg bg-lime-400 px-4 py-3 font-bold text-zinc-950 hover:bg-lime-300" type="submit">Send reset email</button></form>}</AuthFrame>;
}
