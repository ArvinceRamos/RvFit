"use server";

import { isCalendarDate, isUuid } from "@/lib/meal";
import { createClient } from "@/lib/supabase/server";
import { getExercise } from "@/lib/workouts/exercises";
import { validateWorkoutLog } from "@/lib/workouts/log";
import { loadLogRules, loadSavedLog, savedExercisesBySlot } from "@/lib/workouts/log-context";
import { pickLastSessions, type EarlierLog, type LastSession } from "@/lib/workouts/progression";
import { orderSwaps, validateResetRequest, validateSwapRequest } from "@/lib/workouts/swaps";
import { templateKey } from "@/lib/workouts/templates";

export type SwapActionResult = { ok: true } | { ok: false; error: string };

const signInError = "You must be signed in to change your workout.";

// A swap is only saved for the template the user's current Preferences point to.
async function currentTemplateKey(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: saved } = await supabase
    .from("user_preferences")
    .select("experience, equipment, training_days")
    .maybeSingle();
  return saved ? templateKey(saved.experience, saved.training_days, saved.equipment) : null;
}

export async function saveSwapAction(rawSwap: unknown): Promise<SwapActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: signInError };

  const requestedKey = (rawSwap as { templateKey?: unknown } | null)?.templateKey;
  const { data: saved, error: loadError } = await supabase
    .from("user_exercise_swaps")
    .select("slot_key, exercise_key, updated_at")
    .eq("template_key", typeof requestedKey === "string" ? requestedKey : "");
  if (loadError) return { ok: false, error: "Your swap could not be saved. Please try again." };

  const validated = validateSwapRequest(rawSwap, orderSwaps(saved ?? []));
  if (!validated.ok) return validated;
  const swap = validated.data;
  if (swap.templateKey !== (await currentTemplateKey(supabase))) {
    return { ok: false, error: "That plan no longer matches your Preferences. Reload the page." };
  }

  const { error } = await supabase.from("user_exercise_swaps").upsert(
    {
      user_id: user.id,
      template_key: swap.templateKey,
      slot_key: swap.slotKey,
      exercise_key: swap.exerciseKey,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,template_key,slot_key" },
  );
  if (error) return { ok: false, error: "Your swap could not be saved. Please try again." };
  return { ok: true };
}

export async function resetSwapAction(rawReset: unknown): Promise<SwapActionResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: signInError };

  const validated = validateResetRequest(rawReset);
  if (!validated.ok) return validated;

  const { error } = await supabase
    .from("user_exercise_swaps")
    .delete()
    .eq("user_id", user.id)
    .eq("template_key", validated.data.templateKey)
    .eq("slot_key", validated.data.slotKey);
  if (error) return { ok: false, error: "Your swap could not be reset. Please try again." };
  return { ok: true };
}

export type SaveWorkoutResult = { ok: true; logId: string } | { ok: false; error: string };

const saveError = "Your workout could not be saved. Please try again.";

export async function saveWorkoutLogAction(rawLog: unknown): Promise<SaveWorkoutResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in to save a workout." };

  const input = (rawLog ?? {}) as { logId?: unknown; templateKey?: unknown; dayKey?: unknown };
  if (typeof input.templateKey !== "string" || typeof input.dayKey !== "string") {
    return { ok: false, error: "Workout details are invalid." };
  }

  // A new workout uses the plan from current Preferences. An edit keeps the workout's own plan and day.
  const logId = input.logId ?? null;
  let savedExercises = new Map<string, string>();
  if (logId === null) {
    if (input.templateKey !== (await currentTemplateKey(supabase))) {
      return { ok: false, error: "That plan no longer matches your Preferences. Reload the page." };
    }
  } else {
    if (!isUuid(logId)) return { ok: false, error: "Workout details are invalid." };
    const saved = await loadSavedLog(supabase, logId);
    if (!saved) return { ok: false, error: "Workout not found." };
    if (saved.template_key !== input.templateKey || saved.day_key !== input.dayKey) {
      return { ok: false, error: "Workout details are invalid." };
    }
    savedExercises = savedExercisesBySlot(saved);
  }

  const rules = await loadLogRules(supabase, input.templateKey);
  if (!rules) return { ok: false, error: saveError };

  const validated = validateWorkoutLog(rawLog, { ...rules, savedExercises });
  if (!validated.ok) return validated;
  const log = validated.data;

  const { data: savedId, error } = await supabase.rpc("save_workout_log", {
    p_log_id: log.log_id,
    p_template_key: log.template_key,
    p_day_key: log.day_key,
    p_performed_on: log.performed_on,
    p_sets: log.sets,
  });
  if (error || typeof savedId !== "string") return { ok: false, error: saveError };
  return { ok: true, logId: savedId };
}

export type LastSessionsResult = { ok: true; sessions: Record<string, LastSession> } | { ok: false };

// Placeholder bounds: at most this many exercises asked about, and this many earlier workouts looked at.
const maxExerciseKeys = 100;
const earlierWorkoutLimit = 100;

// For each exercise, the most recent workout before the given date that contains it.
export async function loadLastSessionsAction(date: unknown, exerciseKeys: unknown): Promise<LastSessionsResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false };
  if (typeof date !== "string" || !isCalendarDate(date)) return { ok: false };
  if (!Array.isArray(exerciseKeys) || exerciseKeys.length > maxExerciseKeys) return { ok: false };
  const keys = [...new Set(exerciseKeys)];
  if (keys.some((key) => typeof key !== "string" || !getExercise(key))) return { ok: false };
  if (keys.length === 0) return { ok: true, sessions: {} };

  // The inner join keeps only workouts that contain one of these exercises, with only those sets.
  const { data, error } = await supabase
    .from("workout_logs")
    .select("performed_on, workout_log_sets!inner(exercise_key, set_number, reps, seconds, weight_kg)")
    .in("workout_log_sets.exercise_key", keys as string[])
    .lt("performed_on", date)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(earlierWorkoutLimit);
  if (error || !data) return { ok: false };
  return { ok: true, sessions: pickLastSessions(data as unknown as EarlierLog[], keys as string[]) };
}
