import { calculationConfig } from "@/lib/calc/config";
import { addDays } from "@/lib/week";

// Steps and Sleep on Progress: the average of the days that have a number in the last window of local dates
// (ending today), and one line for each of those dates. Like the weight trend, an average needs a minimum
// number of days (calculationConfig.progress, placeholders). For information only; nothing else uses it.

export type DailyActivityRow = { on_date: string; steps: number | null; sleep_minutes: number | null };

export type ActivityDay = { date: string; value: number | null };

export type ActivityBlock = {
  // The window's dates, newest first, with that day's value or null.
  days: ActivityDay[];
  // Whole steps, or whole minutes of sleep. "not_enough" has fewer days with a number than the minimum.
  average: { status: "ok"; value: number; count: number } | { status: "not_enough"; count: number };
};

export type ActivityProgress = { steps: ActivityBlock; sleep: ActivityBlock };

function block(values: ReadonlyMap<string, number | null>, dates: readonly string[]): ActivityBlock {
  const days = dates.map((date) => ({ date, value: values.get(date) ?? null }));
  const present = days.flatMap((day) => (day.value === null ? [] : [day.value]));
  if (present.length < calculationConfig.progress.activity_min_days) {
    return { days, average: { status: "not_enough", count: present.length } };
  }
  const mean = present.reduce((sum, value) => sum + value, 0) / present.length;
  return { days, average: { status: "ok", value: Math.round(mean), count: present.length } };
}

// rows may hold any dates (and a date twice, of which the last wins); only the window's dates count.
export function activityProgress(rows: readonly DailyActivityRow[], today: string): ActivityProgress {
  const dates = Array.from({ length: calculationConfig.progress.activity_window_days }, (_, index) => addDays(today, -index));
  const steps = new Map<string, number | null>();
  const sleep = new Map<string, number | null>();
  for (const row of rows) {
    steps.set(row.on_date, row.steps);
    sleep.set(row.on_date, row.sleep_minutes);
  }
  return { steps: block(steps, dates), sleep: block(sleep, dates) };
}

// The first date of the window, for the database read.
export function activityWindowStart(today: string): string {
  return addDays(today, -(calculationConfig.progress.activity_window_days - 1));
}

// Total minutes as "7 h 30 min". Whole hours show "7 h 0 min", so every value reads the same way.
export function formatSleepMinutes(totalMinutes: number): string {
  const whole = Math.max(0, Math.round(totalMinutes));
  return `${Math.floor(whole / 60)} h ${whole % 60} min`;
}
