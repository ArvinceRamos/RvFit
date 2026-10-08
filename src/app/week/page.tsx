import { AuthFrame } from "@/components/auth-frame";
import { WeekView } from "@/components/week-view";
import { requireUser } from "@/lib/supabase/auth";

export default async function WeekPage() {
  await requireUser();

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Week</h1>
      <p className="mt-3 text-sm text-muted">Monday to Sunday. This page only shows what you have saved. It does not schedule anything.</p>
      <WeekView />
    </AuthFrame>
  );
}
