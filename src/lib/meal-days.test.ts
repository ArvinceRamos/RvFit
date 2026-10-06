import { describe, expect, it } from "vitest";
import { mealTotals } from "./meal";
import { dayPrepList, describeMealDay, groupMealDays, mealDaysRange, readMealDayView } from "./meal-days";

const food = { kcal_per_100g: 100, protein_g_per_100g: 10, carbs_g_per_100g: 20, fat_g_per_100g: 5, fiber_g_per_100g: 1 };
function meal(id: string, meal_date: string, from_plan: boolean, eaten: boolean, grams: number) {
  return { id, label: `Meal ${id}`, meal_date, from_plan, eaten, totals: mealTotals([{ food, grams }]), items: [{ name: "Rice", grams }] };
}

describe("readMealDayView", () => {
  it("reads the three tabs and falls back to today", () => {
    expect(readMealDayView("upcoming")).toBe("upcoming");
    expect(readMealDayView("past")).toBe("past");
    expect(readMealDayView(undefined)).toBe("today");
    expect(readMealDayView("tomorrow")).toBe("today");
    expect(readMealDayView(["past"])).toBe("today");
  });
});

describe("mealDaysRange", () => {
  it("covers today, the next 14 days, or the last 14 days", () => {
    expect(mealDaysRange("today", "2026-10-07")).toEqual({ from: "2026-10-07", to: "2026-10-07", newestFirst: false });
    expect(mealDaysRange("upcoming", "2026-10-07")).toEqual({ from: "2026-10-08", to: "2026-10-21", newestFirst: false });
    expect(mealDaysRange("past", "2026-10-07")).toEqual({ from: "2026-09-23", to: "2026-10-06", newestFirst: true });
  });
});

describe("groupMealDays", () => {
  const meals = [
    meal("1", "2026-10-07", true, true, 100),
    meal("2", "2026-10-07", true, false, 200),
    meal("3", "2026-10-07", false, true, 300),
    meal("4", "2026-10-08", true, false, 400),
  ];

  it("groups by date and splits eaten from planned", () => {
    const [today, tomorrow] = groupMealDays(meals, false);
    expect(today.date).toBe("2026-10-07");
    expect(today.meals.map((entry) => entry.id)).toEqual(["1", "2", "3"]);
    expect(today.eaten.kcal).toBe(400);
    expect(today.eaten_count).toBe(2);
    expect(today.planned_count).toBe(1);
    expect(today.planned_kcal).toBe(200);
    expect(tomorrow.planned_kcal).toBe(400);
  });

  it("lists the newest day first for Past", () => {
    expect(groupMealDays(meals, true).map((day) => day.date)).toEqual(["2026-10-08", "2026-10-07"]);
  });
});

describe("describeMealDay", () => {
  const [today, tomorrow] = groupMealDays(
    [meal("1", "2026-10-07", true, true, 100), meal("2", "2026-10-07", true, false, 200), meal("3", "2026-10-08", true, false, 400)],
    false,
  );

  it("shows eaten against everything saved on a day with planned meals", () => {
    expect(describeMealDay(today, "2026-10-07")).toBe("1 of 2 eaten · 100 / 300 kcal");
  });

  it("shows planned meals on a future day", () => {
    expect(describeMealDay(tomorrow, "2026-10-07")).toBe("1 planned · 400 kcal");
  });

  it("shows a plain count when every meal is eaten", () => {
    const [logged] = groupMealDays([meal("1", "2026-10-06", false, true, 1500), meal("2", "2026-10-06", false, true, 600)], false);
    expect(describeMealDay(logged, "2026-10-07")).toBe("2 meals · 2,100 kcal");
  });
});

describe("dayPrepList", () => {
  it("sums each food across eaten and planned meals, in first-seen order", () => {
    const item = (name: string, grams: number) => ({ name, grams });
    const day = {
      meals: [
        { ...meal("1", "2026-10-07", true, true, 0), items: [item("Chicken", 60), item("Rice", 320), item("Olive oil", 11)] },
        { ...meal("2", "2026-10-07", true, false, 0), items: [item("Rice", 320), item("Olive oil", 11)] },
        { ...meal("3", "2026-10-07", true, false, 0), items: [item("Whey", 64), item("Chicken", 60.5)] },
      ],
    };
    expect(dayPrepList(day)).toEqual([
      { name: "Chicken", grams: 120.5 },
      { name: "Rice", grams: 640 },
      { name: "Olive oil", grams: 22 },
      { name: "Whey", grams: 64 },
    ]);
  });
});
