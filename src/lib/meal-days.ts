import { addTotals, mealTotals, type MealTotals } from "@/lib/meal";
import { addDays } from "@/lib/week";

// The Meals page groups saved meals into day cards with Today, Upcoming, and Past tabs.
export const mealDayViews = ["today", "upcoming", "past"] as const;
export type MealDayView = (typeof mealDayViews)[number];
// How many days Upcoming and Past show.
export const mealDaysWindow = 14;

export function readMealDayView(value: unknown): MealDayView {
  return (mealDayViews as readonly unknown[]).includes(value) ? (value as MealDayView) : "today";
}

// Dates a view covers. Past lists the newest day first.
export function mealDaysRange(view: MealDayView, today: string): { from: string; to: string; newestFirst: boolean } {
  if (view === "upcoming") return { from: addDays(today, 1), to: addDays(today, mealDaysWindow), newestFirst: false };
  if (view === "past") return { from: addDays(today, -mealDaysWindow), to: addDays(today, -1), newestFirst: true };
  return { from: today, to: today, newestFirst: false };
}

export type MealDayMeal = {
  id: string;
  label: string;
  // Saved by the meal planner; these get an "I ate this" checkbox.
  from_plan: boolean;
  eaten: boolean;
  totals: MealTotals;
  items: { name: string; grams: number }[];
};

export type MealDay = {
  date: string;
  meals: MealDayMeal[];
  // Meals ticked as eaten (logged meals are always eaten).
  eaten: MealTotals;
  eaten_count: number;
  // Planner meals not ticked yet.
  planned_count: number;
  planned_kcal: number;
};

// Groups meals (already sorted by label within a date) into days, in date order.
export function groupMealDays(meals: readonly (MealDayMeal & { meal_date: string })[], newestFirst: boolean): MealDay[] {
  const byDate = new Map<string, MealDayMeal[]>();
  for (const { meal_date, ...meal } of meals) byDate.set(meal_date, [...(byDate.get(meal_date) ?? []), meal]);
  const dates = [...byDate.keys()].sort();
  if (newestFirst) dates.reverse();
  return dates.map((date) => {
    const dayMeals = byDate.get(date)!;
    const eaten = dayMeals.filter((meal) => meal.eaten);
    const planned = dayMeals.filter((meal) => !meal.eaten);
    return {
      date,
      meals: dayMeals,
      eaten: eaten.reduce((sum, meal) => addTotals(sum, meal.totals), mealTotals([])),
      eaten_count: eaten.length,
      planned_count: planned.length,
      planned_kcal: planned.reduce((sum, meal) => sum + meal.totals.kcal, 0),
    };
  });
}

const kcal = (value: number) => Math.round(value).toLocaleString("en-US");

// The one-line summary on a closed day card.
export function describeMealDay(day: MealDay, today: string): string {
  const count = day.meals.length;
  const total = day.eaten.kcal + day.planned_kcal;
  if (day.planned_count === 0) return `${count} ${count === 1 ? "meal" : "meals"} · ${kcal(day.eaten.kcal)} kcal`;
  if (day.date > today) return `${count} planned · ${kcal(total)} kcal`;
  return `${day.eaten_count} of ${count} eaten · ${kcal(day.eaten.kcal)} / ${kcal(total)} kcal`;
}

// Each food summed across all of a day's meals (eaten and planned), in first-seen order,
// so the day can be cooked once. Weights are as picked: cooked foods in cooked grams.
export function dayPrepList(day: Pick<MealDay, "meals">): { name: string; grams: number }[] {
  const totals = new Map<string, number>();
  for (const meal of day.meals) {
    for (const item of meal.items) totals.set(item.name, (totals.get(item.name) ?? 0) + item.grams);
  }
  return [...totals].map(([name, grams]) => ({ name, grams: Math.round(grams * 10) / 10 }));
}
