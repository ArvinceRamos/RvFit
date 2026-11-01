// Calendar dates ("YYYY-MM-DD") are plain dates, so format the parts directly to avoid time zone shifts
// (as the web's meal day cards do).
const dayFormat = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" });

export function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return dayFormat.format(new Date(year, month - 1, day));
}
