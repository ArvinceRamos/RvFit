import { describe, expect, it } from "vitest";
import { calculationConfig } from "./calc/config";
import { sevenDayKcal, weightTrend, workoutsPerWeek } from "./progress";

const now = new Date("2026-10-10T12:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe("progress placeholders", () => {
  it("holds the planned values", () => {
    expect(calculationConfig.progress).toEqual({ trend_window_days: 7, trend_min_weigh_ins: 3, history_weigh_ins: 20, chart_max_weigh_ins: 1000, workout_weeks: 8 });
  });
});

describe("weightTrend", () => {
  it("averages three weigh-ins in the window", () => {
    const result = weightTrend(
      [{ logged_at: daysAgo(1), weight_kg: 80 }, { logged_at: daysAgo(3), weight_kg: 81 }, { logged_at: daysAgo(5), weight_kg: 82 }],
      now,
    );
    expect(result).toEqual({ status: "ok", average_kg: 81, count: 3 });
  });

  it("is not enough with two weigh-ins", () => {
    expect(weightTrend([{ logged_at: daysAgo(1), weight_kg: 80 }, { logged_at: daysAgo(2), weight_kg: 81 }], now)).toEqual({
      status: "not_enough",
      count: 2,
    });
  });

  it("is not enough with none", () => {
    expect(weightTrend([], now)).toEqual({ status: "not_enough", count: 0 });
  });

  it("ignores weigh-ins with no weight", () => {
    const result = weightTrend(
      [{ logged_at: daysAgo(1), weight_kg: 80 }, { logged_at: daysAgo(2), weight_kg: null }, { logged_at: daysAgo(3), weight_kg: 82 }],
      now,
    );
    expect(result).toEqual({ status: "not_enough", count: 2 });
  });

  it("includes exactly seven days ago and excludes older and future entries", () => {
    const entries = [
      { logged_at: daysAgo(7), weight_kg: 80 },
      { logged_at: daysAgo(7.01), weight_kg: 100 },
      { logged_at: daysAgo(-1), weight_kg: 100 },
      { logged_at: daysAgo(2), weight_kg: 82 },
      { logged_at: daysAgo(0), weight_kg: 84 },
    ];
    expect(weightTrend(entries, now)).toEqual({ status: "ok", average_kg: 82, count: 3 });
  });

  it("ignores unreadable dates", () => {
    expect(weightTrend([{ logged_at: "nope", weight_kg: 80 }], now)).toEqual({ status: "not_enough", count: 0 });
  });
});

describe("workoutsPerWeek", () => {
  it("counts per Monday-to-Sunday week, newest first", () => {
    const result = workoutsPerWeek(["2026-10-05", "2026-10-11", "2026-10-04", "2026-09-30", "2026-09-29"], "2026-10-08", 3);
    expect(result).toEqual([
      { week_start: "2026-10-05", count: 2 },
      { week_start: "2026-09-28", count: 3 },
      { week_start: "2026-09-21", count: 0 },
    ]);
  });

  it("ignores dates before the first week and in future weeks", () => {
    const result = workoutsPerWeek(["2026-01-01", "2026-10-12"], "2026-10-08", 2);
    expect(result.map((week) => week.count)).toEqual([0, 0]);
  });

  it("uses the placeholder number of weeks by default", () => {
    expect(workoutsPerWeek([], "2026-10-08")).toHaveLength(8);
  });
});

describe("sevenDayKcal", () => {
  const meals = [
    { meal_date: "2026-10-25", eaten: true, kcal: 500.4 },
    { meal_date: "2026-10-25", eaten: true, kcal: 700 },
    { meal_date: "2026-10-25", eaten: false, kcal: 900 },
    { meal_date: "2026-10-21", eaten: true, kcal: 1800 },
    { meal_date: "2026-10-18", eaten: true, kcal: 2000 },
    { meal_date: "2026-10-26", eaten: true, kcal: 2000 },
  ];

  it("covers the 7 days ending today, oldest first", () => {
    expect(sevenDayKcal(meals, "2026-10-25").map((day) => day.date)).toEqual([
      "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25",
    ]);
  });

  it("counts only eaten meals and marks days with none as not logged", () => {
    const days = sevenDayKcal(meals, "2026-10-25");
    expect(days[6]).toEqual({ date: "2026-10-25", kcal: 1200, logged: true });
    expect(days[2]).toEqual({ date: "2026-10-21", kcal: 1800, logged: true });
    expect(days[0]).toEqual({ date: "2026-10-19", kcal: 0, logged: false });
  });
});
