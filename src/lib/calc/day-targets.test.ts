import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/week";
import { targetForDate, weeklyCalories } from "./day-targets";

const target = { kcal: 2000, protein_g: 150, carbs_g: 205, fat_g: 67, fiber_g: 28 };
const monday = "2026-11-02";
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

describe("weeklyCalories", () => {
  it("cuts rest days by 10% and raises training days so the week matches", () => {
    // 5 days: Mon, Tue, Thu, Fri, Sat train; Wed and Sun rest.
    expect(weeklyCalories(2000, 5)).toEqual([2080, 2080, 1800, 2080, 2080, 2080, 1800]);
    expect(weeklyCalories(2000, 4)).toEqual([2150, 2150, 1800, 2150, 2150, 1800, 1800]);
  });

  it("caps training days at +15% and gives rest days a smaller cut (2 days)", () => {
    const week = weeklyCalories(2000, 2)!;
    expect(week[0]).toBe(2300);
    expect(week[1]).toBe(1880);
    expect(sum(week)).toBe(14000);
  });

  it("always adds up to 7 × the target, whatever the rounding", () => {
    for (const kcal of [1201, 1777, 2333, 2565, 3999]) {
      for (const days of [2, 3, 4, 5, 6]) {
        const week = weeklyCalories(kcal, days)!;
        expect(sum(week), `${kcal} ${days}`).toBe(7 * kcal);
        expect(Math.max(...week) - Math.min(...week.filter((value) => value > Math.min(...week)))).toBeLessThanOrEqual(1);
      }
    }
  });

  it("never puts a day under the 1,200 kcal floor", () => {
    expect(weeklyCalories(1200, 5)).toEqual(Array(7).fill(1200));
    const near = weeklyCalories(1300, 3)!;
    expect(Math.min(...near)).toBe(1200);
    expect(sum(near)).toBe(9100);
  });

  it("is flat with no schedule", () => {
    expect(weeklyCalories(2000, null)).toBeNull();
    expect(weeklyCalories(2000, 7)).toBeNull();
  });
});

describe("targetForDate", () => {
  it("changes only kcal and carbs", () => {
    const rest = targetForDate(target, addDays(monday, 2), 5);
    expect(rest).toEqual({ ...target, kcal: 1800, carbs_g: 155, day_type: "rest" });
    const training = targetForDate(target, monday, 5);
    expect(training).toEqual({ ...target, kcal: 2080, carbs_g: 225, day_type: "training" });
  });

  it("keeps the saved target with no training days", () => {
    expect(targetForDate(target, monday, null)).toEqual({ ...target, day_type: null });
  });

  it("matches the weekly total over any 7 days", () => {
    const week = Array.from({ length: 7 }, (_, index) => targetForDate(target, addDays("2026-11-05", index), 3).kcal);
    expect(sum(week)).toBe(14000);
  });
});
