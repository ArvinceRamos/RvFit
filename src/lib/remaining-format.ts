// One kcal format everywhere: whole numbers with a thousands comma, like 1,250 kcal.
export function formatKcal(value: number): string {
  return `${wholeNumber(value)} kcal`;
}

// Totals, targets and remainders use whole grams. Per-100 g food facts keep their decimal.
export function formatGrams(value: number): string {
  return `${wholeNumber(value)} g`;
}

// "|| 0" turns a rounded -0 into 0, so -0.4 never shows as "-0".
function wholeNumber(value: number): string {
  return (Math.round(value) || 0).toLocaleString("en-US");
}

// Negative remainders stay visible as over target. Whole numbers, so anything that rounds to 0 is "Target reached".
export function describeRemaining(value: number, unit: string): string {
  const rounded = Math.round(value);
  const shown = Math.abs(rounded).toLocaleString("en-US");
  if (rounded > 0) return `${shown} ${unit} left`;
  if (rounded === 0) return "Target reached";
  return `${shown} ${unit} over target`;
}

// How full a progress bar is, from 0 to 100. A target of 0 or less shows an empty bar.
export function progressPercent(eaten: number, target: number): number {
  if (!Number.isFinite(eaten) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.min(100, Math.max(0, (eaten / target) * 100));
}
