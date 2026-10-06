// Negative remainders stay visible as over target. Thousands get a comma, like 2,525 kcal.
export function describeRemaining(value: number, unit: string): string {
  const digits = unit === "kcal" ? 0 : 1;
  const shown = Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (value > 0) return `${shown} ${unit} left`;
  if (value === 0) return "Target reached";
  return `${shown} ${unit} over target`;
}

// How full a progress bar is, from 0 to 100. A target of 0 or less shows an empty bar.
export function progressPercent(eaten: number, target: number): number {
  if (!Number.isFinite(eaten) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.min(100, Math.max(0, (eaten / target) * 100));
}
