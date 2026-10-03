import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  return <AuthFrame><h1 className="text-3xl font-bold tracking-tight">Account</h1><p className="mt-5 text-zinc-700">Signed in as {user.email}</p><LogoutButton /></AuthFrame>;
}
