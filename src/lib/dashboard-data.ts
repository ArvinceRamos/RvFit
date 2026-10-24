// Today's data for the Dashboard, read on the server when the page renders.
import { calculationConfig } from "@/lib/calc/config";
import type { MealTotals } from "@/lib/meal";
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
import { reviewStart, weeklyReview, type WeeklyReview } from "@/lib/weekly-review";
import { nextWorkout, type NextUp } from "@/lib/workouts/next-up";
import { resolveTemplate } from "@/lib/workouts/templates";
import type { CheckIn } from "@/lib/check-in";
import { loadCheckInData } from "@/lib/check-in-data";
import type { createClient } from "@/lib/supabase/server";
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
      // The target check-in; null without a saved target.
      checkIn: CheckIn | null;
      // The last 7 days in plain numbers.
      review: WeeklyReview;
    }
  | { ok: false; error: string };

// today is the user's calendar date and now the render's moment (see requestClock).
export async function loadDashboard(supabase: Awaited<ReturnType<typeof createClient>>, today: string, nowMs: number): Promise<DashboardResult> {
  const now = new Date(nowMs);
  // Two trend windows: this week for the trend, and the week before for the review's weight change.
  const since = new Date(now.getTime() - 2 * calculationConfig.progress.trend_window_days * 24 * 60 * 60 * 1000);
  const [target, reviewMeals, workouts, weighIns, units, anyPreferences, anyMeal, anyWeighIn, weekWorkouts, checkInData, reviewWorkouts] = await Promise.all([
    loadSavedTarget(supabase),
    // The review's 7 days; today's meals are the last of them.
    loadMeals(supabase, reviewStart(today), today),
    loadWorkouts(supabase, today, today),
    loadWeighInsSince(supabase, since),
    loadUnits(supabase),
    // One row is enough to know whether each setup step is done.
    supabase.from("user_preferences").select("experience, equipment, training_days").limit(1),
    supabase.from("meals").select("id").limit(1),
    supabase.from("body_logs").select("id").not("weight_kg", "is", null).limit(1),
    loadWorkouts(supabase, weekStart(today), today),
    loadCheckInData(supabase, now.getTime()),
    loadWorkouts(supabase, reviewStart(today), today),
  ]);
  if (target === "error" || checkInData === "error" || !reviewMeals || !reviewWorkouts || !workouts || !weighIns || !units || anyPreferences.error || anyMeal.error || anyWeighIn.error || !weekWorkouts) {
    logError("dashboard.load", anyPreferences.error, anyMeal.error, anyWeighIn.error);
    return { ok: false, error: "Your dashboard could not be loaded. Please try again." };
  }
  const meals = reviewMeals.filter((meal) => meal.meal_date === today);
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
    checkIn: checkInData?.checkIn ?? null,
    review: weeklyReview({
      today,
      meals: reviewMeals.map((meal) => ({ meal_date: meal.meal_date, eaten: meal.eaten, kcal: meal.totals.kcal })),
      workoutDates: reviewWorkouts.map((workout) => workout.performed_on),
      plannedWorkouts: preferences?.training_days ?? null,
      weighIns,
      now,
    }),
  };
}
