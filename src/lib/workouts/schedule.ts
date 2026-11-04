// The suggested Monday-to-Sunday week (docs/SPLITS-AND-CALORIES.md). A suggestion only: users can train on any day.
import { calculationConfig } from "@/lib/calc/config";

export const weekdayShortNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** ISO weekdays (1 = Monday ... 7 = Sunday) that are training days. Empty for a count with no schedule. */
export function trainingWeekdays(trainingDays: number): readonly number[] {
  const map: Record<number, readonly number[]> = calculationConfig.schedule.training_weekdays;
  return map[trainingDays] ?? [];
}

export type ScheduleDay<D> = { weekday: number; short: (typeof weekdayShortNames)[number]; day: D | null };

/** Seven entries, Monday first. The plan's days fill the training weekdays in order; the rest are rest days (day null). */
export function weekSchedule<D>(days: readonly D[]): ScheduleDay<D>[] {
  const weekdays = trainingWeekdays(days.length);
  return weekdayShortNames.map((short, index) => {
    const position = weekdays.indexOf(index + 1);
    return { weekday: index + 1, short, day: position === -1 ? null : (days[position] ?? null) };
  });
}

/** ISO weekday of a "YYYY-MM-DD" calendar date, computed in UTC so time zones never shift it. */
export function isoWeekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

export function isTrainingDate(date: string, trainingDays: number): boolean {
  return trainingWeekdays(trainingDays).includes(isoWeekday(date));
}

/** One line for the Train page, e.g. "Suggested week: Mon Upper · Tue Lower ... Rest on Wed, Sun. Any day works ...". */
export function scheduleSummary(days: readonly { name: string }[]): string | null {
  const schedule = weekSchedule(days);
  const rest = schedule.filter((item) => !item.day).map((item) => item.short);
  if (rest.length === 0 || rest.length === 7) return null;
  const training = schedule.flatMap((item) => (item.day ? [`${item.short} ${item.day.name}`] : []));
  return `Suggested week: ${training.join(" · ")}. Rest on ${rest.join(", ")}. Any day works if your week is different.`;
}

/** Short weekday name for each plan day key, e.g. "upper" -> "Mon". */
export function weekdayByDayKey(days: readonly { key: string }[]): Map<string, string> {
  return new Map(weekSchedule(days).flatMap((item) => (item.day ? [[item.day.key, item.short] as const] : [])));
}
