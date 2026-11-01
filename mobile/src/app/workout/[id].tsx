import { Stack, useLocalSearchParams } from "expo-router";
import { isUuid } from "@/lib/meal";
import { formatWeight, logSlots, planForLog } from "@/lib/workouts/log";
import { loadLogRules, loadSavedLog, savedExercisesBySlot } from "@/lib/workouts/log-context";
import { ErrorView, LoadingView } from "~/components/screen";
import { WorkoutLogForm, type WorkoutLogInitial } from "~/features/workout-log-form";
import { sharedClient } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";

async function load(id: string) {
  if (!isUuid(id)) return { ok: false as const, error: "That workout was not found." };
  const log = await loadSavedLog(sharedClient, id);
  if (!log) return { ok: false as const, error: "That workout was not found." };
  // An edit keeps the workout's own plan, even if Preferences have changed since.
  const rules = await loadLogRules(sharedClient, log.template_key);
  const template = rules ? planForLog(log.template_key, rules.swaps) : null;
  const templateDay = template?.days.find((item) => item.key === log.day_key);
  const slots = template ? logSlots(template, log.day_key, savedExercisesBySlot(log)) : null;
  if (!rules || !templateDay || !slots) return { ok: false as const, error: "This workout could not be loaded. Please try again." };
  const entries: WorkoutLogInitial["entries"] = {};
  for (const set of [...log.workout_log_sets].sort((a, b) => a.set_number - b.set_number)) {
    const entry = (entries[set.slot_key] ??= { exerciseKey: set.exercise_key, sets: [] });
    entry.sets.push({ amount: String(set.reps ?? set.seconds ?? ""), weight: set.weight_kg === null ? "" : formatWeight(Number(set.weight_kg), rules.units) });
  }
  return { ok: true as const, log, rules, templateDay, slots, entries };
}

// Edit a saved workout (web: /workouts/log/[id]).
export default function EditWorkout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const screen = useScreenData(["workout-form", "edit", id], () => load(id));
  if (screen.loading) return <LoadingView label="Loading workout…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "This workout could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { log, rules, templateDay, slots, entries } = screen.data;
  return (
    <>
      <Stack.Screen options={{ title: `Edit ${templateDay.name}` }} />
      <WorkoutLogForm
        initial={{ logId: log.id, templateKey: log.template_key, dayKey: log.day_key, date: log.performed_on, duration: log.duration_min === null ? "" : String(log.duration_min), entries }}
        showHistory={false}
        slots={slots}
        units={rules.units}
      />
    </>
  );
}
