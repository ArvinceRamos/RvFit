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
    router.replace("/account");
    router.refresh();
  }

  return (
    <AuthFrame>
      <h1 className="text-3xl font-bold tracking-tight">Log in</h1>
      <form className="mt-8 space-y-5" onSubmit={logIn}>
        <label className="block text-sm font-semibold">Email<input className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
        <label className="block text-sm font-semibold">Password<input className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base" onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button className="w-full rounded-lg bg-lime-400 px-4 py-3 font-bold text-zinc-950 hover:bg-lime-300" type="submit">Log in</button>
      </form>
      <p className="mt-6 text-sm text-zinc-700"><Link className="font-semibold underline" href="/forgot-password">Forgot password?</Link></p>
      <p className="mt-3 text-sm text-zinc-700">Need an account? <Link className="font-semibold underline" href="/signup">Create one</Link></p>
    </AuthFrame>
  );
}
