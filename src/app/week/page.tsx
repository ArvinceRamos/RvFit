import { AuthFrame } from "@/components/auth-frame";
import { WeekView } from "@/components/week-view";
import { requestClock } from "@/lib/request-clock";
import { requireUser } from "@/lib/supabase/auth";
import { loadWeek } from "@/lib/week-data";

export default async function WeekPage() {
  const [{ supabase }, { today }] = await Promise.all([requireUser(), requestClock()]);
  const result = await loadWeek(supabase, today);

  return (
    <AuthFrame showNav>
      <h1 className="page-title">Week</h1>
      <p className="mt-3 text-sm text-muted">Monday to Sunday. Workout days follow a suggested week; you can train on any day that suits you.</p>
      <WeekView result={result} />
    </AuthFrame>
  );
}
