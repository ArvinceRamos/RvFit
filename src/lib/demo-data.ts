import { checkMacroMismatch } from "@/lib/calc/calculate";

// Fake demo data for the landing page App preview panels. Not real user data. See docs/PHASE5.md.
// Every number on the landing page previews comes from this file.

export const DEMO_TARGETS = { calories: 2200, protein: 150, carbs: 230, fat: 70, fiber: 30 } as const;

// Stage 1 panel: sample result card. Targets only, no calorie math.
export const DEMO_RESULT = {
  heading: "Sample starting target",
  macros: [
    { label: "Protein", grams: DEMO_TARGETS.protein },
    { label: "Carbs", grams: DEMO_TARGETS.carbs },
    { label: "Fat", grams: DEMO_TARGETS.fat },
    { label: "Fiber", grams: DEMO_TARGETS.fiber },
  ],
} as const;

// Stage 2 panel: meal builder slots and the day's calories bar.
// The meal starts ticked as eaten. Unticking it takes its calories off the day: eatenBefore + mealCalories = dayCalories.
export const DEMO_MEAL = {
  label: "Meal 1",
  slots: [
    { slot: "Protein", food: "Chicken breast", grams: 150 },
    { slot: "Carbs", food: "Cooked rice", grams: 180 },
    { slot: "Fat", food: "Olive oil", grams: 10 },
    { slot: "Fiber", food: "Broccoli", grams: 100 },
  ],
  mealCalories: 620,
  eatenBefore: 760,
  dayCalories: 1380,
} as const;

// Stage 3 panel: one workout day. The first exercise has a Swap button that cycles through these exercise keys.
// The names come from the real exercise library, so they cannot drift from the Workouts page.
export const DEMO_SWAP_KEYS = ["goblet-squat", "dumbbell-front-squat", "bodyweight-squat"] as const;

export const DEMO_WORKOUT = {
  day: "Day 1",
  name: "Full body",
  exercises: [
    { name: "Goblet squat", sets: "3 × 8–12" },
    { name: "Dumbbell bench press", sets: "3 × 8–12" },
    { name: "One-arm dumbbell row", sets: "3 × 8–12" },
    { name: "Romanian deadlift", sets: "3 × 8–12" },
    { name: "Plank", sets: "3 × 30 s" },
  ],
} as const;

// Width of a bar from 0 to 100, for fake values only.
export function barPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

// Hero panel: a sample day so far (eaten amounts against the targets above).
export const DEMO_TODAY = {
  calories: 1380,
  macros: [
    { label: "Protein", grams: 96, target: DEMO_TARGETS.protein, lead: true },
    { label: "Carbs", grams: 140, target: DEMO_TARGETS.carbs, lead: false },
    { label: "Fat", grams: 41, target: DEMO_TARGETS.fat, lead: false },
    { label: "Fiber", grams: 18, target: DEMO_TARGETS.fiber, lead: false },
  ],
} as const;

// Stage 4 panels: 90 days of fake weigh-ins in kg (oldest first), and workouts finished in each of the last 6 weeks.
// A slow fixed drift with day-to-day wobble, rounded to 0.1 kg. Same numbers on every load.
export const DEMO_WEIGHTS_KG: readonly number[] = Array.from({ length: 90 }, (_, i) => {
  const kg = 80.2 - i * 0.035 + 0.35 * Math.sin(i * 1.7) + 0.2 * Math.sin(i * 0.45);
  return Math.round(kg * 10) / 10;
});

// The range buttons on the stage 4 weight preview, as on the Progress page (without "All").
export const DEMO_WEIGHT_RANGES = [7, 30, 90] as const;
export const DEMO_WORKOUT_WEEKS = { counts: [3, 4, 3, 2, 4, 3], planned: 4 } as const;

// Average of each day and the 6 days before it. The first 6 days have no average yet, so the list starts at day 7.
export function sevenDayAverages(values: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 6; i < values.length; i++) {
    const window = values.slice(i - 6, i + 1);
    out.push(window.reduce((sum, v) => sum + v, 0) / 7);
  }
  return out;
}

// The last `days` fake weigh-ins and their 7-day averages. Averages use the days before the window too,
// so even the 7-day view has a full average line. offset is how many weigh-ins come before the first average.
export function demoWeightWindow(days: number) {
  const start = Math.max(DEMO_WEIGHTS_KG.length - days, 0);
  const weights = DEMO_WEIGHTS_KG.slice(start);
  const averages = sevenDayAverages(DEMO_WEIGHTS_KG).slice(Math.max(start - 6, 0));
  return { weights, averages, offset: weights.length - averages.length };
}

// Stage 5 panel: macros after an edit. Carbs were raised to 280 g, so the 5% warning shows
// (checkMacroMismatch decides, as on the Profile screen). The −/+ buttons move carbs by carbStep.
// The warning text is the same as on the Profile and targets screen.
export const DEMO_PROFILE_EDIT = {
  macros: [
    { label: "Protein", grams: 150, edited: false },
    { label: "Carbs", grams: 280, edited: true },
    { label: "Fat", grams: 70, edited: false },
    { label: "Fiber", grams: 30, edited: false },
  ],
  carbStep: 10,
  carbMin: 200,
  carbMax: 320,
  warning:
    "Your macro calories differ from the target by more than 5%. This is a warning only; your calorie target has not changed.",
} as const;

// Whether the stage 5 preview shows the warning for a carbs value. Same check as the Profile screen.
export function demoMacroWarning(carbsG: number): boolean {
  const gramsOf = (label: string) => DEMO_PROFILE_EDIT.macros.find((m) => m.label === label)?.grams ?? 0;
  const result = checkMacroMismatch(
    { protein_g: gramsOf("Protein"), carbs_g: carbsG, fat_g: gramsOf("Fat"), fiber_g: gramsOf("Fiber") },
    DEMO_TARGETS.calories,
  );
  return result.ok && result.data.warning;
}
