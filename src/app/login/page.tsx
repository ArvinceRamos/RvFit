"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { authErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(authErrorMessage(signInError.message));
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <AuthFrame>
      <h1 className="text-3xl font-bold tracking-tight">Log in</h1>
      <form className="mt-8 space-y-5" onSubmit={logIn}>
        <label className="block text-sm font-semibold">Email<input className="mt-2 w-full rounded-lg border border-edge bg-field px-3 py-2 text-base" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label className="block text-sm font-semibold">Password<input className="mt-2 w-full rounded-lg border border-edge bg-field px-3 py-2 text-base" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        {error && <p className="rounded-lg bg-danger-bg p-3 text-sm text-danger">{error}</p>}
        <button className="w-full rounded-lg bg-accent px-4 py-3 font-bold text-on-accent hover:bg-accent-soft" type="submit">Log in</button>
      </form>
      <p className="mt-6 text-sm text-muted"><Link className="font-semibold underline" href="/forgot-password">Forgot password?</Link></p>
      <p className="mt-3 text-sm text-muted">Need an account? <Link className="font-semibold underline" href="/signup">Create one</Link></p>
    </AuthFrame>
  );
}
