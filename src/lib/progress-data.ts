// Progress page data, read on the server when the page renders.
import { calculationConfig } from "@/lib/calc/config";
import type { CheckIn } from "@/lib/check-in";
import { loadCheckInData } from "@/lib/check-in-data";
import { logError } from "@/lib/log";
import {
  loadChartWeighIns,
  loadLatestWeighIns,
  loadMeals,
  loadSavedTarget,
  loadUnits,
  loadWeighInsSince,
  loadWorkouts,
  type SavedTarget,
  type WeighInRow,
} from "@/lib/overview-data";
import { sevenDayKcal, weightTrend, workoutsPerWeek, type KcalDay, type WeekCount, type WeightTrend } from "@/lib/progress";
import type { createClient } from "@/lib/supabase/server";
import type { PreferredUnits } from "@/lib/weigh-in";
import { addDays, recentWeekStarts } from "@/lib/week";
import { reviewStart } from "@/lib/weekly-review";
import { DEFAULT_CHART_RANGE, rangeStart } from "@/lib/weight-chart";

export type ChartPoint = { logged_at: string; weight_kg: number };

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
      // The target check-in; null without a saved target.
      checkIn: CheckIn | null;
      // The chart's first range (DEFAULT_CHART_RANGE), newest first, in kg. Other ranges load when picked.
      chart: ChartPoint[] | null;
      // Eaten calories for the last 7 days, and the target to compare with (null without one).
      kcalDays: KcalDay[];
      targetKcal: number | null;
    }
  | { ok: false; error: string };

// Weigh-in history, the weight trend, and workouts per week. Values stay in kg and cm.
// Pages convert them to the user's units. today is the user's calendar date and now the render's moment.
export async function loadProgress(supabase: Awaited<ReturnType<typeof createClient>>, today: string, nowMs: number): Promise<ProgressResult> {
  const { trend_window_days, history_weigh_ins, workout_weeks } = calculationConfig.progress;
  const now = new Date(nowMs);
  const since = new Date(now.getTime() - trend_window_days * 24 * 60 * 60 * 1000);
  const oldestWeek = recentWeekStarts(today, workout_weeks)[workout_weeks - 1];
  const [units, history, recent, workouts, preferences, target, checkInData, chart, meals] = await Promise.all([
    loadUnits(supabase),
    loadLatestWeighIns(supabase, history_weigh_ins),
    loadWeighInsSince(supabase, since),
    loadWorkouts(supabase, oldestWeek, addDays(today, 7)),
    // Training days from Preferences, for the workouts ring. No row means no plan yet.
    supabase.from("user_preferences").select("training_days").maybeSingle(),
    loadSavedTarget(supabase),
    loadCheckInData(supabase, now.getTime()),
    loadChartWeighIns(supabase, rangeStart(DEFAULT_CHART_RANGE, nowMs), calculationConfig.progress.chart_max_weigh_ins),
    loadMeals(supabase, reviewStart(today), today),
  ]);
  if (checkInData === "error" || !units || !history || !recent || !workouts || preferences.error || target === "error" || !meals) {
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
    checkIn: checkInData?.checkIn ?? null,
    // A chart read error only affects the chart, which says so.
    chart,
    kcalDays: sevenDayKcal(meals.map((meal) => ({ meal_date: meal.meal_date, eaten: meal.eaten, kcal: meal.totals.kcal })), today),
    targetKcal: target?.kcal ?? null,
  };
}
