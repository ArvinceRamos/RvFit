import { AuthFrame } from "@/components/auth-frame";
import { ProgressView } from "@/components/progress-view";
import { requireUser } from "@/lib/supabase/auth";

export default async function ProgressPage() {
  await requireUser();

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Progress</h1>
      <ProgressView />
    </AuthFrame>
  );
}
