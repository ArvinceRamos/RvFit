import { Stack, useLocalSearchParams } from "expo-router";
import { loadLogRules } from "@/lib/workouts/log-context";
import { logSlots, planForLog } from "@/lib/workouts/log";
import { templateKey } from "@/lib/workouts/templates";
import { ErrorView, LoadingView } from "~/components/screen";
import { WorkoutLogForm } from "~/features/workout-log-form";
import { sharedClient, supabase } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";

async function load(dayKey: string) {
  const { data: saved, error } = await supabase.from("user_preferences").select("experience, equipment, training_days").maybeSingle();
  if (error) return { ok: false as const, error: "This workout could not be loaded. Please try again." };
  const key = saved ? templateKey(saved.experience, saved.training_days, saved.equipment) : null;
  if (!key) return { ok: false as const, error: "Save your training preferences first, then log a workout from Train." };
  const rules = await loadLogRules(sharedClient, key);
  const template = rules ? planForLog(key, rules.swaps) : null;
  const templateDay = template?.days.find((item) => item.key === dayKey);
  const slots = template ? logSlots(template, dayKey, new Map()) : null;
  if (!rules || !templateDay || !slots) return { ok: false as const, error: "This workout could not be loaded. Please try again." };
  return { ok: true as const, key, rules, templateDay, slots };
}

// Log a new workout for one plan day (web: /workouts/log/new?day=...).
export default function NewWorkout() {
  const { day } = useLocalSearchParams<{ day?: string }>();
  const dayKey = typeof day === "string" ? day : "";
  // Only the first load matters: a refetch must not reset a form the user is typing in.
  const screen = useScreenData(["workout-form", "new", dayKey], () => load(dayKey));
  if (screen.loading) return <LoadingView label="Loading workout…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "This workout could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { key, rules, templateDay, slots } = screen.data;
  return (
    <>
      <Stack.Screen options={{ title: `Log ${templateDay.name}` }} />
      <WorkoutLogForm initial={{ logId: null, templateKey: key, dayKey, date: "", duration: "", entries: {} }} showHistory slots={slots} units={rules.units} />
    </>
  );
}
