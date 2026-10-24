import { AccountDraftSave } from "@/components/account-draft-save";
import { AuthFrame } from "@/components/auth-frame";
import { DashboardView } from "@/components/dashboard-view";
import { loadDashboard } from "@/lib/dashboard-data";
import { greeting } from "@/lib/display-name";
import { requestClock } from "@/lib/request-clock";
import { requireUser } from "@/lib/supabase/auth";

export default async function DashboardPage() {
  const [{ supabase, user }, { today, now }] = await Promise.all([requireUser(), requestClock()]);
  const result = await loadDashboard(supabase, today, now);

  return (
    <AuthFrame showNav>
      <h1 className="page-title">Today</h1>
      <p className="mt-3 text-sm text-muted">{greeting(user.user_metadata)}</p>
      {/* Saves a guest draft from this browser after sign-in. Its action re-renders this page when it saves one. */}
      <AccountDraftSave />
      <DashboardView result={result} />
    </AuthFrame>
  );
}
