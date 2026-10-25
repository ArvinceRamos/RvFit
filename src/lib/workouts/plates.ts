import type { PreferredUnits } from "@/lib/weigh-in";

// A standard Olympic bar and common gym plates. Equipment sizes, not health values.
const setups = {
  metric: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], unit: "kg" },
  imperial: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5], unit: "lb" },
} as const;

// Barbell exercises all have keys that start with "barbell-". Keys are permanent, so this stays true.
export function isBarbellExercise(exerciseKey: string): boolean {
  return exerciseKey.startsWith("barbell-");
}

export type PlateLoad =
  | { kind: "below_bar"; bar: number }
  | { kind: "bar_only"; bar: number; shortPerSide: number }
  | { kind: "plates"; bar: number; perSide: number[]; shortPerSide: number };

// Plates for each side of the bar, largest first, for a total weight typed in the user's units.
// When standard plates cannot make the weight exactly, the closest load below it is given with the gap.
// null for blank or unreadable text.
export function plateLoad(weightText: string, units: PreferredUnits): PlateLoad | null {
  const text = weightText.trim();
  if (text === "") return null;
  const total = Number(text);
  if (!Number.isFinite(total) || total <= 0) return null;

  const { bar, plates } = setups[units];
  if (total < bar) return { kind: "below_bar", bar };
  // Work in hundredths so 2.5 and 1.25 add up without float drift.
  let left = Math.round(((total - bar) / 2) * 100);
  if (left === 0) return { kind: "bar_only", bar, shortPerSide: 0 };
  const perSide: number[] = [];
  for (const plate of plates) {
    const size = Math.round(plate * 100);
    while (left >= size) {
      perSide.push(plate);
      left -= size;
    }
  }
  if (perSide.length === 0) return { kind: "bar_only", bar, shortPerSide: left / 100 };
  return { kind: "plates", bar, perSide, shortPerSide: left / 100 };
}

// One line under the weight field, such as "Each side of a 20 kg bar: 20 + 2.5 kg".
export function plateText(weightText: string, units: PreferredUnits): string | null {
  const load = plateLoad(weightText, units);
  if (!load) return null;
  const unit = setups[units].unit;
  if (load.kind === "below_bar") return `Less than a ${load.bar} ${unit} bar.`;
  const short = load.shortPerSide > 0 ? ` (${load.shortPerSide} ${unit} short each side)` : "";
  if (load.kind === "bar_only") return `Just the ${load.bar} ${unit} bar${short}.`;
  const line = `Each side of a ${load.bar} ${unit} bar: ${load.perSide.join(" + ")} ${unit}`;
  return `${line}${short}.`;
}
