import type { createClient } from "@/lib/supabase/server";
import type { PreferredUnits } from "@/lib/weigh-in";
import { orderSwaps } from "./swaps";
import type { Swap } from "./templates";

type Client = Awaited<ReturnType<typeof createClient>>;

// The user's units (metric if none saved) and saved swaps for one template, for the signed-in user.
export async function loadLogRules(supabase: Client, templateKey: string): Promise<{ units: PreferredUnits; swaps: Swap[] } | null> {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("preferred_units").maybeSingle();
  const { data: swaps, error: swapsError } = await supabase
    .from("user_exercise_swaps")
    .select("slot_key, exercise_key, updated_at")
    .eq("template_key", templateKey);
  if (profileError || swapsError) return null;
  return { units: profile?.preferred_units === "imperial" ? "imperial" : "metric", swaps: orderSwaps(swaps ?? []) };
}

export type SavedLog = {
  id: string;
  template_key: string;
  day_key: string;
  performed_on: string;
  workout_log_sets: { slot_key: string; exercise_key: string; set_number: number; reps: number | null; seconds: number | null; weight_kg: number | string | null }[];
};

// Row-level security means only the owner can read a log, so another user's id finds nothing.
export async function loadSavedLog(supabase: Client, logId: string): Promise<SavedLog | null> {
  const { data } = await supabase
    .from("workout_logs")
    .select("id, template_key, day_key, performed_on, workout_log_sets(slot_key, exercise_key, set_number, reps, seconds, weight_kg)")
    .eq("id", logId)
    .maybeSingle();
  return (data as SavedLog | null) ?? null;
}

export function savedExercisesBySlot(log: SavedLog | null): Map<string, string> {
  return new Map(log?.workout_log_sets.map((set) => [set.slot_key, set.exercise_key]) ?? []);
}
