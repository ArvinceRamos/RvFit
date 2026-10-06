"use server";

import { calculationConfig } from "@/lib/calc/config";
import { isCalendarDate, type MealTotals } from "@/lib/meal";
import {
  loadMeals,
  loadSavedTarget,
  loadUnits,
  loadWeighInsSince,
  loadWorkouts,
  sumMealTotals,
  type DayMeal,
  type LoggedWorkout,
  type SavedTarget,
} from "@/lib/overview-data";
import { weightTrend, type WeightTrend } from "@/lib/progress";
import { createClient } from "@/lib/supabase/server";
import type { PreferredUnits } from "@/lib/weigh-in";

export type DashboardResult =
  | {
      ok: true;
      target: SavedTarget | null;
      totals: MealTotals;
      meals: DayMeal[];
      workouts: LoggedWorkout[];
      trend: WeightTrend;
      units: PreferredUnits;
    }
  | { ok: false; error: string };

// Today's data for the signed-in user. The date is the browser's local date.
export async function loadDashboardAction(today: unknown): Promise<DashboardResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in." };
  if (typeof today !== "string" || !isCalendarDate(today)) return { ok: false, error: "Choose a valid date." };

  const now = new Date();
  const since = new Date(now.getTime() - calculationConfig.progress.trend_window_days * 24 * 60 * 60 * 1000);
  const [target, meals, workouts, weighIns, units] = await Promise.all([
    loadSavedTarget(supabase),
    loadMeals(supabase, today, today),
    loadWorkouts(supabase, today, today),
    loadWeighInsSince(supabase, since),
    loadUnits(supabase),
  ]);
  if (target === "error" || !meals || !workouts || !weighIns || !units) {
    return { ok: false, error: "Your dashboard could not be loaded. Please try again." };
  }

  return {
    ok: true,
    target,
    totals: sumMealTotals(meals.map((meal) => meal.totals)),
    meals,
    workouts,
    trend: weightTrend(weighIns, now),
    units,
  };
}
