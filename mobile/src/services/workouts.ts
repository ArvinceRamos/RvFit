import { isCalendarDate, isUuid } from "@/lib/meal";
import { getExercise } from "@/lib/workouts/exercises";
import { resolveUnits, validateWorkoutLog } from "@/lib/workouts/log";
import { loadLogRules, loadSavedLog, savedExercisesBySlot } from "@/lib/workouts/log-context";
import { pickLastSessions, type EarlierLog, type LastSession } from "@/lib/workouts/progression";
import { orderSwaps, validateResetRequest, validateSwapRequest } from "@/lib/workouts/swaps";
import { templateKey } from "@/lib/workouts/templates";
import { logError } from "@/lib/log";
import { sharedClient, supabase } from "~/lib/supabase";
import { currentUserId, type ActionResult } from "./session";

// Mobile versions of src/app/workouts/actions.ts.

export async function deleteWorkoutLog(logId: unknown): Promise<ActionResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to delete a workout." };
  if (!isUuid(logId)) return { ok: false, error: "Workout details are invalid." };
  const { data, error } = await supabase.from("workout_logs").delete().eq("id", logId).select("id");
  if (error) {
    logError("workouts.delete", error);
    return { ok: false, error: "The workout could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Workout not found." };
  return { ok: true };
}

const signInError = "You must be signed in to change your workout.";
const stalePlan = "That plan no longer matches your Preferences. Go back and open it again.";

// A swap or a new workout is only saved for the template the user's current Preferences point to.
async function currentTemplateKey(): Promise<string | null> {
  const { data: saved } = await supabase.from("user_preferences").select("experience, equipment, training_days").maybeSingle();
  return saved ? templateKey(saved.experience, saved.training_days, saved.equipment) : null;
}

export async function saveSwap(rawSwap: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: signInError };
  const requestedKey = (rawSwap as { templateKey?: unknown } | null)?.templateKey;
  const { data: saved, error: loadError } = await supabase
    .from("user_exercise_swaps")
    .select("slot_key, exercise_key, updated_at")
    .eq("template_key", typeof requestedKey === "string" ? requestedKey : "");
  if (loadError) {
    logError("workouts.loadSwap", loadError);
    return { ok: false, error: "Your swap could not be saved. Please try again." };
  }
  const validated = validateSwapRequest(rawSwap, orderSwaps(saved ?? []));
  if (!validated.ok) return validated;
  const swap = validated.data;
  if (swap.templateKey !== (await currentTemplateKey())) return { ok: false, error: stalePlan };

  const { error } = await supabase.from("user_exercise_swaps").upsert(
    { user_id: userId, template_key: swap.templateKey, slot_key: swap.slotKey, exercise_key: swap.exerciseKey, updated_at: new Date().toISOString() },
    { onConflict: "user_id,template_key,slot_key" },
  );
  if (error) {
    logError("workouts.saveSwap", error);
    return { ok: false, error: "Your swap could not be saved. Please try again." };
  }
  return { ok: true };
}

export async function resetSwap(rawReset: unknown): Promise<ActionResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: signInError };
  const validated = validateResetRequest(rawReset);
  if (!validated.ok) return validated;
  const { error } = await supabase
    .from("user_exercise_swaps")
    .delete()
    .eq("user_id", userId)
    .eq("template_key", validated.data.templateKey)
    .eq("slot_key", validated.data.slotKey);
  if (error) {
    logError("workouts.resetSwap", error);
    return { ok: false, error: "Your swap could not be reset. Please try again." };
  }
  return { ok: true };
}

export type SaveWorkoutResult = { ok: true; logId: string } | { ok: false; error: string };
const saveError = "Your workout could not be saved. Please try again.";

export async function saveWorkoutLog(rawLog: unknown): Promise<SaveWorkoutResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to save a workout." };
  const input = (rawLog ?? {}) as { logId?: unknown; templateKey?: unknown; dayKey?: unknown; saveKey?: unknown; units?: unknown };
  if (typeof input.templateKey !== "string" || typeof input.dayKey !== "string") return { ok: false, error: "Workout details are invalid." };
  // One key per new workout, so pressing Save again after a lost reply updates it instead of adding a second.
  const saveKey = input.saveKey ?? null;
  if (saveKey !== null && !isUuid(saveKey)) return { ok: false, error: "Workout details are invalid." };

  // A new workout uses the plan from current Preferences. An edit keeps the workout's own plan and day.
  const logId = input.logId ?? null;
  let savedExercises = new Map<string, string>();
  if (logId === null) {
    if (input.templateKey !== (await currentTemplateKey())) return { ok: false, error: stalePlan };
  } else {
    if (!isUuid(logId)) return { ok: false, error: "Workout details are invalid." };
    const saved = await loadSavedLog(sharedClient, logId);
    if (!saved) return { ok: false, error: "Workout not found." };
    if (saved.template_key !== input.templateKey || saved.day_key !== input.dayKey) return { ok: false, error: "Workout details are invalid." };
    savedExercises = savedExercisesBySlot(saved);
  }

  const rules = await loadLogRules(sharedClient, input.templateKey);
  if (!rules) return { ok: false, error: saveError };
  const units = resolveUnits(input.units, rules.units);
  if (!units.ok) return units;
  const validated = validateWorkoutLog(rawLog, { ...rules, units: units.data, savedExercises });
  if (!validated.ok) return validated;
  const log = validated.data;

  const { data: savedId, error } = await supabase.rpc("save_workout_log", {
    p_log_id: log.log_id,
    p_template_key: log.template_key,
    p_day_key: log.day_key,
    p_performed_on: log.performed_on,
    p_sets: log.sets,
    p_save_key: log.log_id === null ? saveKey : null,
    p_duration_min: log.duration_min,
  });
  if (error || typeof savedId !== "string") {
    if (error) logError("workouts.save", error);
    return { ok: false, error: saveError };
  }
  return { ok: true, logId: savedId };
}

export type LastSessionsResult = { ok: true; sessions: Record<string, LastSession> } | { ok: false };
const maxExerciseKeys = 100;
const earlierWorkoutLimit = 100;

// For each exercise, the most recent workout before the given date that contains it.
export async function fetchLastSessions(date: string, exerciseKeys: string[]): Promise<LastSessionsResult> {
  if (!(await currentUserId())) return { ok: false };
  if (!isCalendarDate(date)) return { ok: false };
  if (exerciseKeys.length > maxExerciseKeys) return { ok: false };
  const keys = [...new Set(exerciseKeys)];
  if (keys.some((key) => !getExercise(key))) return { ok: false };
  if (keys.length === 0) return { ok: true, sessions: {} };
  const { data, error } = await supabase
    .from("workout_logs")
    .select("performed_on, workout_log_sets!inner(exercise_key, set_number, reps, seconds, weight_kg)")
    .in("workout_log_sets.exercise_key", keys)
    .lt("performed_on", date)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(earlierWorkoutLimit);
  if (error || !data) return { ok: false };
  return { ok: true, sessions: pickLastSessions(data as unknown as EarlierLog[], keys) };
}
