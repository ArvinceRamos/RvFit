import { AccountDraftSave } from "@/components/account-draft-save";
import { AuthFrame } from "@/components/auth-frame";
import { DashboardView } from "@/components/dashboard-view";
import { requireUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const { data: savedTargets } = await supabase
    .from("calorie_targets")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  const savedTarget = savedTargets?.[0];

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Dashboard</h1>
      <p className="mt-3 text-sm text-muted">Signed in as {user.email}</p>
      {/* Saves a guest draft from this browser after sign-in. The page refreshes when it saves one. */}
      <AccountDraftSave />
      <DashboardView refreshKey={savedTarget?.created_at ?? "none"} />
    </AuthFrame>
  );
}
