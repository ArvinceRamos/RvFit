"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button className="mt-6 rounded-lg border border-zinc-300 bg-white px-4 py-3 font-semibold hover:bg-zinc-100" onClick={logOut} type="button">Log out</button>;
}
