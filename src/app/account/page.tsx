import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { AccountDraftSave } from "@/components/account-draft-save";
import { LogoutButton } from "@/components/logout-button";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const { data: savedTargets } = await supabase
    .from("calorie_targets")
    .select("id")
    .limit(1);
  const hasSavedTarget = Boolean(savedTargets?.length);

  return <AuthFrame><h1 className="text-3xl font-bold tracking-tight">Account</h1><p className="mt-5 text-zinc-700">Signed in as {user.email}</p><AccountDraftSave hasSavedTarget={hasSavedTarget} /><LogoutButton /></AuthFrame>;
}
