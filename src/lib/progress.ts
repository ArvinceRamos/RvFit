import { calculationConfig } from "@/lib/calc/config";
import { recentWeekStarts, weekStart } from "@/lib/week";

const msPerDay = 24 * 60 * 60 * 1000;

export type WeighInPoint = { logged_at: string; weight_kg: number | null };

export type WeightTrend =
  | { status: "ok"; average_kg: number; count: number }
  | { status: "not_enough"; count: number };

// The average of weigh-ins that have a weight, from the last window of days up to now.
// Fewer than the minimum is "not enough data". Placeholder rule from the plan.
export function weightTrend(weighIns: readonly WeighInPoint[], now: Date): WeightTrend {
  const { trend_window_days, trend_min_weigh_ins } = calculationConfig.progress;
  const from = now.getTime() - trend_window_days * msPerDay;
  const weights = weighIns.flatMap((entry) => {
    const time = new Date(entry.logged_at).getTime();
    return entry.weight_kg !== null && Number.isFinite(time) && time >= from && time <= now.getTime() ? [entry.weight_kg] : [];
  });
  if (weights.length < trend_min_weigh_ins) return { status: "not_enough", count: weights.length };
  return { status: "ok", average_kg: weights.reduce((sum, weight) => sum + weight, 0) / weights.length, count: weights.length };
}

export type WeekCount = { week_start: string; count: number };

// Workouts logged in each of the last weeks, newest first. Dates outside those weeks are ignored.
export function workoutsPerWeek(
  performedOn: readonly string[],
  today: string,
  weeks: number = calculationConfig.progress.workout_weeks,
): WeekCount[] {
  const counts = new Map(recentWeekStarts(today, weeks).map((start) => [start, 0]));
  for (const date of performedOn) {
    const start = weekStart(date);
    if (counts.has(start)) counts.set(start, (counts.get(start) ?? 0) + 1);
  }
  return [...counts].map(([week_start, count]) => ({ week_start, count }));
}
