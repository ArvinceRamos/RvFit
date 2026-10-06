import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { WeekView } from "@/components/week-view";
import { createClient } from "@/lib/supabase/server";

export default async function WeekPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AuthFrame showNav>
      <h1 className="text-3xl font-bold tracking-tight">Week</h1>
      <p className="mt-3 text-sm text-zinc-700">Monday to Sunday. This page only shows what you have saved. It does not schedule anything.</p>
      <WeekView />
    </AuthFrame>
  );
}
