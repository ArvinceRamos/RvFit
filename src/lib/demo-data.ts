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
export const DEMO_MEAL = {
  label: "Meal 1",
  slots: [
    { slot: "Protein", food: "Chicken breast", grams: 150 },
    { slot: "Carbs", food: "Cooked rice", grams: 180 },
    { slot: "Fat", food: "Olive oil", grams: 10 },
    { slot: "Fiber", food: "Broccoli", grams: 100 },
  ],
  mealCalories: 620,
  dayCalories: 1380,
} as const;

// Stage 3 panel: one workout day.
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

// Stage 4 panels: 14 days of fake weigh-ins in kg, and workouts finished in each of the last 6 weeks.
export const DEMO_WEIGHTS_KG = [78.4, 78.1, 78.3, 77.9, 78.0, 77.7, 77.8, 77.5, 77.6, 77.2, 77.4, 77.1, 77.0, 76.9] as const;
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

// Stage 5 panel: macros after an edit. Carbs were raised to 260 g, so the 5% warning shows.
// The warning text is the same as on the Profile and targets screen.
export const DEMO_PROFILE_EDIT = {
  macros: [
    { label: "Protein", grams: 150, edited: false },
    { label: "Carbs", grams: 260, edited: true },
    { label: "Fat", grams: 70, edited: false },
    { label: "Fiber", grams: 30, edited: false },
  ],
  warning:
    "Your macro calories differ from the target by more than 5%. This is a warning only; your calorie target has not changed.",
} as const;
