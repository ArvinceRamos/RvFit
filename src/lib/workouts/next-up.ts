// "Next up" on the Dashboard: the first plan day not yet logged this week.
// The plan's days repeat to fill the week (for example A, B, A, B for four days on a two-day split),
// and each log this week uses up one matching day in that order.

export type NextUp =
  | { status: "next"; dayKey: string; dayName: string; done: number; planned: number }
  | { status: "done"; done: number; planned: number };

export function nextWorkout(
  days: readonly { key: string; name: string }[],
  trainingDays: number,
  loggedDayKeysThisWeek: readonly string[],
): NextUp | null {
  if (days.length === 0 || trainingDays < 1) return null;
  const sequence = Array.from({ length: trainingDays }, (_, index) => days[index % days.length]);
  const remaining = new Map<string, number>();
  for (const key of loggedDayKeysThisWeek) remaining.set(key, (remaining.get(key) ?? 0) + 1);

  // Each plan slot is done if a matching log is left to use up; the first open slot is next.
  const doneSlots = sequence.map((day) => {
    const left = remaining.get(day.key) ?? 0;
    if (left > 0) remaining.set(day.key, left - 1);
    return left > 0;
  });
  const done = doneSlots.filter(Boolean).length;
  const nextIndex = doneSlots.indexOf(false);
  if (nextIndex === -1) return { status: "done", done, planned: trainingDays };
  const next = sequence[nextIndex];
  return { status: "next", dayKey: next.key, dayName: next.name, done, planned: trainingDays };
}
