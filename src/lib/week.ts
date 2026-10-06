// Dates are plain "YYYY-MM-DD" calendar dates. Weeks run Monday to Sunday. All maths is in UTC
// so the user's time zone and daylight saving never shift a date.
const msPerDay = 24 * 60 * 60 * 1000;

function toUtc(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  return fromUtc(new Date(toUtc(date).getTime() + days * msPerDay));
}

// The Monday of the week that contains the date.
export function weekStart(date: string): string {
  const dayOfWeek = toUtc(date).getUTCDay();
  return addDays(date, -((dayOfWeek + 6) % 7));
}

// Monday to Sunday.
export function weekDates(date: string): string[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

// The Mondays of the current week and the weeks before it, newest first.
export function recentWeekStarts(date: string, weeks: number): string[] {
  const start = weekStart(date);
  return Array.from({ length: weeks }, (_, index) => addDays(start, -7 * index));
}
