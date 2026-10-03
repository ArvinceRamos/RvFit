"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { authErrorMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    setError(undefined);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(authErrorMessage(updateError.message));
      return;
    }
    router.replace("/account");
    router.refresh();
  }

  return <AuthFrame><h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1><form className="mt-8 space-y-5" onSubmit={resetPassword}><label className="block text-sm font-semibold">New password<input className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<button className="w-full rounded-lg bg-lime-400 px-4 py-3 font-bold text-zinc-950 hover:bg-lime-300" type="submit">Save new password</button></form></AuthFrame>;
}
