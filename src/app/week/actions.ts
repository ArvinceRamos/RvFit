"use server";

import { isCalendarDate } from "@/lib/meal";
import {
  eatenAndPlanned,
  loadMeals,
  loadPlanDays,
  loadSavedTarget,
  loadWorkouts,
  type LoggedWorkout,
  type PlanDay,
  type SavedTarget,
} from "@/lib/overview-data";
import type { MealTotals } from "@/lib/meal";
import { createClient } from "@/lib/supabase/server";
import { weekDates } from "@/lib/week";

// totals: meals ticked as eaten. planned_kcal: meals saved but not eaten yet.
export type WeekDay = {
  date: string;
  totals: MealTotals;
  meal_count: number;
  eaten_count: number;
  planned_kcal: number;
  workouts: LoggedWorkout[];
};

export type WeekResult =
  | {
      ok: true;
      today: string;
      target: SavedTarget | null;
      days: WeekDay[];
      // Null when Preferences are not saved. Counts are workouts logged this week for each plan day.
      plan: { days: (PlanDay & { count: number })[] } | null;
    }
  | { ok: false; error: string };

// The week that contains the browser's local date, Monday to Sunday. Read-only.
export async function loadWeekAction(today: unknown): Promise<WeekResult> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, error: "You must be signed in." };
  if (typeof today !== "string" || !isCalendarDate(today)) return { ok: false, error: "Choose a valid date." };

  const dates = weekDates(today);
  const [target, meals, workouts, plan] = await Promise.all([
    loadSavedTarget(supabase),
    loadMeals(supabase, dates[0], dates[6]),
    loadWorkouts(supabase, dates[0], dates[6]),
    loadPlanDays(supabase),
  ]);
  if (target === "error" || plan === "error" || !meals || !workouts) {
    return { ok: false, error: "Your week could not be loaded. Please try again." };
  }

  return {
    ok: true,
    today,
    target,
    days: dates.map((date) => {
      const split = eatenAndPlanned(meals.filter((meal) => meal.meal_date === date));
      return {
        date,
        totals: split.totals,
        meal_count: split.meal_count,
        eaten_count: split.eaten_count,
        planned_kcal: split.planned.kcal,
        workouts: workouts.filter((workout) => workout.performed_on === date),
      };
    }),
    plan: plan
      ? {
          days: plan.days.map((day) => ({
            ...day,
            count: workouts.filter((workout) => workout.template_key === plan.template_key && workout.day_key === day.key).length,
          })),
        }
      : null,
  };
}
