"use server";

import { calculationConfig } from "@/lib/calc/config";
import { isCalendarDate, isUuid } from "@/lib/meal";
import {
  loadChartWeighIns,
  loadLatestWeighIns,
  loadSavedTarget,
  loadUnits,
  loadWeighInsSince,
  loadWorkouts,
  type SavedTarget,
  type WeighInRow,
} from "@/lib/overview-data";
import { weightTrend, workoutsPerWeek, type WeekCount, type WeightTrend } from "@/lib/progress";
import { getActionUser } from "@/lib/supabase/auth";
import type { PreferredUnits } from "@/lib/weigh-in";
import { addDays, recentWeekStarts } from "@/lib/week";
import { logError } from "@/lib/log";
import { isChartRangeKey, rangeStart } from "@/lib/weight-chart";

export type ProgressResult =
  | {
      ok: true;
      units: PreferredUnits;
      trend: WeightTrend;
      history: WeighInRow[];
      weeks: WeekCount[];
      plannedDays: number | null;
      // The current goal and pace, shown as context next to the trend. Null for a manual target.
      goal: SavedTarget["goal"];
      pace: SavedTarget["pace"];
    }
  | { ok: false; error: string };

// Weigh-in history, the weight trend, and workouts per week. Values stay in kg and cm.
// Pages convert them to the user's units. The date is the browser's local date.
export async function loadProgressAction(today: unknown): Promise<ProgressResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in." };
  const { supabase } = auth;
  if (typeof today !== "string" || !isCalendarDate(today)) return { ok: false, error: "Choose a valid date." };

  const { trend_window_days, history_weigh_ins, workout_weeks } = calculationConfig.progress;
  const now = new Date();
  const since = new Date(now.getTime() - trend_window_days * 24 * 60 * 60 * 1000);
  const oldestWeek = recentWeekStarts(today, workout_weeks)[workout_weeks - 1];
  const [units, history, recent, workouts, preferences, target] = await Promise.all([
    loadUnits(supabase),
    loadLatestWeighIns(supabase, history_weigh_ins),
    loadWeighInsSince(supabase, since),
    loadWorkouts(supabase, oldestWeek, addDays(today, 7)),
    // Training days from Preferences, for the workouts ring. No row means no plan yet.
    supabase.from("user_preferences").select("training_days").maybeSingle(),
    loadSavedTarget(supabase),
  ]);
  if (!units || !history || !recent || !workouts || preferences.error || target === "error") {
    logError("progress.load", preferences.error);
    return { ok: false, error: "Your progress could not be loaded. Please try again." };
  }

  return {
    ok: true,
    units,
    trend: weightTrend(recent, now),
    history,
    weeks: workoutsPerWeek(workouts.map((workout) => workout.performed_on), today),
    plannedDays: preferences.data?.training_days ?? null,
    goal: target?.goal ?? null,
    pace: target?.pace ?? null,
  };
}

export type WeightChartResult = { ok: true; points: { logged_at: string; weight_kg: number }[] } | { ok: false; error: string };

// Weigh-ins for one chart range, newest first, in kg. Capped by chart_max_weigh_ins.
export async function loadWeightChartAction(range: unknown): Promise<WeightChartResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in." };
  if (!isChartRangeKey(range)) return { ok: false, error: "Choose a valid range." };

  const points = await loadChartWeighIns(auth.supabase, rangeStart(range, Date.now()), calculationConfig.progress.chart_max_weigh_ins);
  if (!points) {
    logError("progress.loadChart", null);
    return { ok: false, error: "Your weight chart could not be loaded. Please try again." };
  }
  return { ok: true, points };
}

export type DeleteWeighInResult = { ok: true } | { ok: false; error: string };

// Row-level security limits the delete to the user's own weigh-ins.
export async function deleteWeighInAction(weighInId: unknown): Promise<DeleteWeighInResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in to delete a weigh-in." };
  const { supabase } = auth;
  if (!isUuid(weighInId)) return { ok: false, error: "Weigh-in details are invalid." };

  const { data, error } = await supabase.from("body_logs").delete().eq("id", weighInId).select("id");
  if (error) {
    logError("progress.deleteWeighIn", error);
    return { ok: false, error: "The weigh-in could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Weigh-in not found." };
  return { ok: true };
}
