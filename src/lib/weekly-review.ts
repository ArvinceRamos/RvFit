import { calculationConfig } from "@/lib/calc/config";
import { weightTrend, type WeighInPoint } from "@/lib/progress";
import { addDays } from "@/lib/week";

// The weekly review on the Dashboard: the last 7 days (today and the 6 before) in plain numbers.
// No streaks and no scores. Dates are the browser's local calendar dates.

export const REVIEW_DAYS = 7;

export type WeeklyReviewInput = {
  today: string;
  meals: readonly { meal_date: string; eaten: boolean; kcal: number }[];
  workoutDates: readonly string[];
  // Training days a week from Preferences; null when they are not saved.
  plannedWorkouts: number | null;
  weighIns: readonly WeighInPoint[];
  now: Date;
};

export type WeeklyReview = {
  daysLogged: number;
  workouts: number;
  plannedWorkouts: number | null;
  // Average eaten kcal on the days that have a meal ticked as eaten; null with no such day.
  averageKcal: number | null;
  // This 7-day weight average minus the 7 days before, in kg; null without enough weigh-ins in both.
  weightChangeKg: number | null;
};

/** The first calendar date of the review, so callers load just enough. */
export function reviewStart(today: string): string {
  return addDays(today, -(REVIEW_DAYS - 1));
}

export function weeklyReview(input: WeeklyReviewInput): WeeklyReview {
  const from = reviewStart(input.today);
  const inWindow = (date: string) => date >= from && date <= input.today;

  const kcalByDay = new Map<string, number>();
  for (const meal of input.meals) {
    if (!meal.eaten || !inWindow(meal.meal_date)) continue;
    kcalByDay.set(meal.meal_date, (kcalByDay.get(meal.meal_date) ?? 0) + meal.kcal);
  }
  const dayTotals = [...kcalByDay.values()];

  const thisWeek = weightTrend(input.weighIns, input.now);
  const weekBefore = weightTrend(input.weighIns, new Date(input.now.getTime() - calculationConfig.progress.trend_window_days * 24 * 60 * 60 * 1000));

  return {
    daysLogged: dayTotals.length,
    workouts: input.workoutDates.filter(inWindow).length,
    plannedWorkouts: input.plannedWorkouts,
    averageKcal: dayTotals.length > 0 ? dayTotals.reduce((sum, kcal) => sum + kcal, 0) / dayTotals.length : null,
    weightChangeKg: thisWeek.status === "ok" && weekBefore.status === "ok" ? thisWeek.average_kg - weekBefore.average_kg : null,
  };
}
