import { describe, expect, it } from "vitest";
import { reviewStart, weeklyReview, type WeeklyReviewInput } from "./weekly-review";

const now = new Date("2026-10-25T12:00:00Z");
const today = "2026-10-25";
const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000 - 60_000).toISOString();

function input(overrides: Partial<WeeklyReviewInput> = {}): WeeklyReviewInput {
  return { today, meals: [], workoutDates: [], plannedWorkouts: 3, weighIns: [], now, ...overrides };
}

describe("reviewStart", () => {
  it("covers today and the 6 days before", () => {
    expect(reviewStart(today)).toBe("2026-10-19");
  });
});

describe("weeklyReview", () => {
  it("counts days with an eaten meal and averages kcal over those days only", () => {
    const review = weeklyReview(input({
      meals: [
        { meal_date: "2026-10-25", eaten: true, kcal: 800 },
        { meal_date: "2026-10-25", eaten: true, kcal: 1200 },
        { meal_date: "2026-10-24", eaten: true, kcal: 1800 },
        { meal_date: "2026-10-23", eaten: false, kcal: 2500 }, // planned, not eaten
        { meal_date: "2026-10-18", eaten: true, kcal: 3000 }, // 7 days ago, outside the review
      ],
    }));
    expect(review).toMatchObject({ daysLogged: 2, averageKcal: 1900 });
  });

  it("has no average without an eaten meal", () => {
    expect(weeklyReview(input())).toMatchObject({ daysLogged: 0, averageKcal: null });
  });

  it("counts workouts in the 7 days against the planned training days", () => {
    const review = weeklyReview(input({ workoutDates: ["2026-10-18", "2026-10-19", "2026-10-22"], plannedWorkouts: 3 }));
    expect(review).toMatchObject({ workouts: 2, plannedWorkouts: 3 });
    expect(weeklyReview(input({ plannedWorkouts: null }))).toMatchObject({ plannedWorkouts: null });
  });

  it("compares this week's weight average with the week before", () => {
    const weighIns = [
      ...[1, 3, 5].map((d) => ({ logged_at: daysAgo(d), weight_kg: 89.6 })),
      ...[8, 10, 12].map((d) => ({ logged_at: daysAgo(d), weight_kg: 90 })),
    ];
    expect(weeklyReview(input({ weighIns })).weightChangeKg).toBeCloseTo(-0.4, 6);
  });

  it("has no weight change without 3 weigh-ins in each week", () => {
    const weighIns = [...[1, 3, 5].map((d) => ({ logged_at: daysAgo(d), weight_kg: 89.6 })), { logged_at: daysAgo(9), weight_kg: 90 }];
    expect(weeklyReview(input({ weighIns })).weightChangeKg).toBeNull();
  });
});
