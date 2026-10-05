import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { WorkoutLogForm } from "@/components/workout-log-form";
import { createClient } from "@/lib/supabase/server";
import { logSlots, planForLog } from "@/lib/workouts/log";
import { loadLogRules } from "@/lib/workouts/log-context";
import { templateKey } from "@/lib/workouts/templates";

export default async function NewWorkoutLogPage({ searchParams }: PageProps<"/workouts/log/new">) {
  const { day } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved } = await supabase
    .from("user_preferences")
    .select("experience, equipment, training_days")
    .maybeSingle();
  const key = saved ? templateKey(saved.experience, saved.training_days, saved.equipment) : null;
  if (!key) redirect("/workouts");

  const rules = await loadLogRules(supabase, key);
  const template = rules ? planForLog(key, rules.swaps) : null;
  const dayKey = typeof day === "string" ? day : "";
  const templateDay = template?.days.find((item) => item.key === dayKey);
  const slots = template ? logSlots(template, dayKey, new Map()) : null;

  if (rules && (!templateDay || !slots)) notFound();

  return (
    <AuthFrame showNav>
      <Link className="text-sm font-semibold underline" href="/workouts">Back to Workouts</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Log {templateDay?.name ?? "workout"}</h1>
      {!rules || !templateDay || !slots ? (
        <p className="mt-6 text-sm text-red-800">This workout could not be loaded. Please try again.</p>
      ) : (
        <WorkoutLogForm
          initial={{ logId: null, templateKey: key, dayKey, date: "", entries: {} }}
          slots={slots}
          showHistory
          units={rules.units}
        />
      )}
    </AuthFrame>
  );
}
