import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { ProgressView } from "@/components/progress-view";
import { createClient } from "@/lib/supabase/server";

export default async function ProgressPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AuthFrame showNav>
      <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      <ProgressView />
    </AuthFrame>
  );
}
