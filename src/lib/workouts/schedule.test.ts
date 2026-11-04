import { describe, expect, it } from "vitest";
import { splits } from "./splits";
import { isTrainingDate, isoWeekday, scheduleSummary, trainingWeekdays, weekSchedule, weekdayByDayKey } from "./schedule";

const names = (days: number) => weekSchedule(splits.find((split) => split.trainingDays === days)!.days).map((item) => item.day?.name ?? "Rest");

describe("weekSchedule", () => {
  it("lays out every split Monday to Sunday", () => {
    expect(names(2)).toEqual(["Full body A", "Rest", "Rest", "Full body B", "Rest", "Rest", "Rest"]);
    expect(names(3)).toEqual(["Full body A", "Rest", "Full body B", "Rest", "Full body C", "Rest", "Rest"]);
    expect(names(4)).toEqual(["Upper A", "Lower A", "Rest", "Upper B", "Lower B", "Rest", "Rest"]);
    expect(names(5)).toEqual(["Upper", "Lower", "Rest", "Push", "Pull", "Legs", "Rest"]);
    expect(names(6)).toEqual(["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Rest"]);
  });

  it("has one training weekday per split day and never more than 3 in a row before 6 days", () => {
    for (const split of splits) {
      const weekdays = trainingWeekdays(split.trainingDays);
      expect(weekdays).toHaveLength(split.days.length);
      if (split.trainingDays < 6) {
        let run = 0;
        let longest = 0;
        weekdays.forEach((day, index) => {
          run = index > 0 && weekdays[index - 1] === day - 1 ? run + 1 : 1;
          longest = Math.max(longest, run);
        });
        expect(longest, split.key).toBeLessThanOrEqual(3);
      }
    }
  });

  it("gives no schedule for a count it does not know", () => {
    expect(trainingWeekdays(7)).toEqual([]);
    expect(weekSchedule([]).every((item) => item.day === null)).toBe(true);
  });
});

describe("dates", () => {
  it("finds the ISO weekday of a calendar date", () => {
    expect(isoWeekday("2026-11-02")).toBe(1); // Monday
    expect(isoWeekday("2026-11-08")).toBe(7); // Sunday
  });

  it("tells training dates from rest dates", () => {
    expect(isTrainingDate("2026-11-02", 5)).toBe(true); // Monday, Upper
    expect(isTrainingDate("2026-11-04", 5)).toBe(false); // Wednesday, rest
    expect(isTrainingDate("2026-11-08", 6)).toBe(false); // Sunday, rest
  });
});

describe("scheduleSummary", () => {
  it("names training and rest days", () => {
    const five = splits.find((split) => split.trainingDays === 5)!.days;
    expect(scheduleSummary(five)).toBe(
      "Suggested week: Mon Upper · Tue Lower · Thu Push · Fri Pull · Sat Legs. Rest on Wed, Sun. Any day works if your week is different.",
    );
    expect(weekdayByDayKey(five).get("push")).toBe("Thu");
    expect(scheduleSummary([])).toBeNull();
  });
});
