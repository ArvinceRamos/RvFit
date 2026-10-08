import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { WorkoutLogForm, type WorkoutLogInitial } from "@/components/workout-log-form";
import { isUuid } from "@/lib/meal";
import { requireUser } from "@/lib/supabase/auth";
import { formatWeight, logSlots, planForLog } from "@/lib/workouts/log";
import { loadLogRules, loadSavedLog, savedExercisesBySlot } from "@/lib/workouts/log-context";

export default async function EditWorkoutLogPage({ params }: PageProps<"/workouts/log/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  if (!isUuid(id)) notFound();

  const log = await loadSavedLog(supabase, id);
  if (!log) notFound();

  // An edit keeps the workout's own plan, even if Preferences have changed since.
  const rules = await loadLogRules(supabase, log.template_key);
  const savedExercises = savedExercisesBySlot(log);
  const template = rules ? planForLog(log.template_key, rules.swaps) : null;
  const templateDay = template?.days.find((item) => item.key === log.day_key);
  const slots = template ? logSlots(template, log.day_key, savedExercises) : null;

  const entries: WorkoutLogInitial["entries"] = {};
  if (rules) {
    const sorted = [...log.workout_log_sets].sort((a, b) => a.set_number - b.set_number);
    for (const set of sorted) {
      const entry = (entries[set.slot_key] ??= { exerciseKey: set.exercise_key, sets: [] });
      entry.sets.push({
        amount: String(set.reps ?? set.seconds ?? ""),
        weight: set.weight_kg === null ? "" : formatWeight(Number(set.weight_kg), rules.units),
      });
    }
  }

  return (
    <AuthFrame showNav>
      <Link className="text-sm font-semibold underline" href="/workouts">Back to Workouts</Link>
      <h1 className="mt-3 text-4xl font-medium tracking-tight">Edit {templateDay?.name ?? "workout"}</h1>
      {!rules || !templateDay || !slots ? (
        <p className="mt-6 text-sm text-danger">This workout could not be loaded. Please try again.</p>
      ) : (
        <WorkoutLogForm
          initial={{ logId: log.id, templateKey: log.template_key, dayKey: log.day_key, date: log.performed_on, entries }}
          slots={slots}
          showHistory={false}
          units={rules.units}
        />
      )}
    </AuthFrame>
  );
}
