import { redirect } from "next/navigation";
import { AccountDraftSave } from "@/components/account-draft-save";
import { AuthFrame } from "@/components/auth-frame";
import { DashboardView } from "@/components/dashboard-view";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { data: savedTargets } = await supabase
    .from("calorie_targets")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  const savedTarget = savedTargets?.[0];

  return (
    <AuthFrame showNav>
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="mt-3 text-sm text-zinc-700">Signed in as {user.email}</p>
      {/* Saves a guest draft from this browser after sign-in. The page refreshes when it saves one. */}
      <AccountDraftSave hasSavedTarget={Boolean(savedTarget)} />
      <DashboardView refreshKey={savedTarget?.created_at ?? "none"} />
    </AuthFrame>
  );
}
