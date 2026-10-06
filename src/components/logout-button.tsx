"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const defaultClassName = "mt-6 rounded-lg border border-edge bg-field px-4 py-3 font-semibold hover:bg-line";

export function LogoutButton({ className = defaultClassName }: { className?: string }) {
  const router = useRouter();

  async function logOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <button className={className} onClick={logOut} type="button">Log out</button>;
}
