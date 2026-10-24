import { AuthFrame } from "@/components/auth-frame";
import { ProgressView } from "@/components/progress-view";
import { loadProgress } from "@/lib/progress-data";
import { requestClock } from "@/lib/request-clock";
import { requireUser } from "@/lib/supabase/auth";

export default async function ProgressPage() {
  const [{ supabase }, { today, now, timeZone }] = await Promise.all([requireUser(), requestClock()]);
  const result = await loadProgress(supabase, today, now);

  return (
    <AuthFrame showNav>
      <h1 className="page-title">Progress</h1>
      <ProgressView now={now} result={result} timeZone={timeZone} />
    </AuthFrame>
  );
}
