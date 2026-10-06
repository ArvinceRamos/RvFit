import { describe, expect, it } from "vitest";
import { addDays, recentWeekStarts, weekDates, weekStart } from "./week";

describe("addDays", () => {
  it("crosses month, year, and leap-day boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("weekStart", () => {
  it("returns the Monday of the week", () => {
    expect(weekStart("2026-10-05")).toBe("2026-10-05"); // Monday
    expect(weekStart("2026-10-06")).toBe("2026-10-05"); // Tuesday
    expect(weekStart("2026-10-11")).toBe("2026-10-05"); // Sunday belongs to the week before the next Monday
    expect(weekStart("2026-10-12")).toBe("2026-10-12");
  });

  it("crosses a year boundary", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28"); // Friday
  });
});

describe("weekDates", () => {
  it("lists Monday to Sunday", () => {
    expect(weekDates("2026-10-08")).toEqual([
      "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11",
    ]);
  });

  it("gives the same week for every day in it", () => {
    const week = weekDates("2026-10-05");
    for (const date of week) expect(weekDates(date)).toEqual(week);
  });

  it("spans a month end", () => {
    expect(weekDates("2026-11-01")[0]).toBe("2026-10-26");
    expect(weekDates("2026-11-01")[6]).toBe("2026-11-01");
  });
});

describe("recentWeekStarts", () => {
  it("lists this week and earlier weeks, newest first", () => {
    expect(recentWeekStarts("2026-10-08", 3)).toEqual(["2026-10-05", "2026-09-28", "2026-09-21"]);
  });
});
