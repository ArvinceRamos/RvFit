"use server";

import { calculationConfig } from "@/lib/calc/config";
import { isCalendarDate, type MealTotals } from "@/lib/meal";
import {
  eatenAndPlanned,
  loadMeals,
  loadSavedTarget,
  loadUnits,
  loadWeighInsSince,
  loadWorkouts,
  type DayMeal,
  type LoggedWorkout,
  type SavedTarget,
} from "@/lib/overview-data";
import { weightTrend, type WeightTrend } from "@/lib/progress";
import type { SetupFlags } from "@/lib/setup-steps";
import { weekStart } from "@/lib/week";
import { nextWorkout, type NextUp } from "@/lib/workouts/next-up";
import { resolveTemplate } from "@/lib/workouts/templates";
import { getActionUser } from "@/lib/supabase/auth";
import type { PreferredUnits } from "@/lib/weigh-in";
import { logError } from "@/lib/log";

export type DashboardResult =
  | {
      ok: true;
      target: SavedTarget | null;
      totals: MealTotals;
      // Planner meals saved for today but not ticked as eaten yet.
      planned_kcal: number;
      meals: DayMeal[];
      workouts: LoggedWorkout[];
      trend: WeightTrend;
      units: PreferredUnits;
      setup: SetupFlags;
      // The first plan day not logged this week; null without saved Preferences.
      nextUp: NextUp | null;
    }
  | { ok: false; error: string };

// Today's data for the signed-in user. The date is the browser's local date.
export async function loadDashboardAction(today: unknown): Promise<DashboardResult> {
  const auth = await getActionUser();
  if (!auth) return { ok: false, error: "You must be signed in." };
  const { supabase } = auth;
  if (typeof today !== "string" || !isCalendarDate(today)) return { ok: false, error: "Choose a valid date." };

  const now = new Date();
  const since = new Date(now.getTime() - calculationConfig.progress.trend_window_days * 24 * 60 * 60 * 1000);
  const [target, meals, workouts, weighIns, units, anyPreferences, anyMeal, anyWeighIn, weekWorkouts] = await Promise.all([
    loadSavedTarget(supabase),
    loadMeals(supabase, today, today),
    loadWorkouts(supabase, today, today),
    loadWeighInsSince(supabase, since),
    loadUnits(supabase),
    // One row is enough to know whether each setup step is done.
    supabase.from("user_preferences").select("experience, equipment, training_days").limit(1),
    supabase.from("meals").select("id").limit(1),
    supabase.from("body_logs").select("id").not("weight_kg", "is", null).limit(1),
    loadWorkouts(supabase, weekStart(today), today),
  ]);
  if (target === "error" || !meals || !workouts || !weighIns || !units || anyPreferences.error || anyMeal.error || anyWeighIn.error || !weekWorkouts) {
    logError("dashboard.load", anyPreferences.error, anyMeal.error, anyWeighIn.error);
    return { ok: false, error: "Your dashboard could not be loaded. Please try again." };
  }
  const { totals, planned } = eatenAndPlanned(meals);
  const preferences = anyPreferences.data?.[0];
  const template = preferences ? resolveTemplate(preferences.experience, preferences.training_days, preferences.equipment) : null;
  const nextUp = template
    ? nextWorkout(
        template.days,
        preferences!.training_days,
        weekWorkouts.filter((workout) => workout.template_key === template.key).map((workout) => workout.day_key),
      )
    : null;

  return {
    ok: true,
    target,
    // Only meals ticked as eaten count. Every meal of the day is still listed.
    totals,
    planned_kcal: planned.kcal,
    meals,
    workouts,
    trend: weightTrend(weighIns, now),
    units,
    setup: {
      hasTarget: target !== null,
      hasPreferences: (anyPreferences.data ?? []).length > 0,
      hasMeal: (anyMeal.data ?? []).length > 0,
      hasWeighIn: (anyWeighIn.data ?? []).length > 0,
    },
    nextUp,
  };
}
