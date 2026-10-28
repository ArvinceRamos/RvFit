import { describe, expect, it } from "vitest";
import { activityProgress, activityWindowStart, formatSleepMinutes, type DailyActivityRow } from "./progress";

const today = "2026-10-28";

function row(on_date: string, steps: number | null, sleep_minutes: number | null = null): DailyActivityRow {
  return { on_date, steps, sleep_minutes };
}

describe("activityProgress", () => {
  it("lists the 7 dates ending today, newest first, with a dash value (null) for empty days", () => {
    const { steps } = activityProgress([], today);
    expect(steps.days.map((day) => day.date)).toEqual([
      "2026-10-28", "2026-10-27", "2026-10-26", "2026-10-25", "2026-10-24", "2026-10-23", "2026-10-22",
    ]);
    expect(steps.days.every((day) => day.value === null)).toBe(true);
  });

  it("has no average with no rows, 1 day or 2 days", () => {
    expect(activityProgress([], today).steps.average).toEqual({ status: "not_enough", count: 0 });
    expect(activityProgress([row(today, 5000)], today).steps.average).toEqual({ status: "not_enough", count: 1 });
    expect(activityProgress([row(today, 5000), row("2026-10-27", 7000)], today).steps.average).toEqual({ status: "not_enough", count: 2 });
  });

  it("averages exactly 3 days", () => {
    const rows = [row(today, 6000), row("2026-10-27", 9000), row("2026-10-22", 3000)];
    expect(activityProgress(rows, today).steps.average).toEqual({ status: "ok", value: 6000, count: 3 });
  });

  it("averages only the days that have a number, so gaps do not count as 0", () => {
    const rows = [row(today, 8000), row("2026-10-26", 4000), row("2026-10-24", 6000)];
    const { steps } = activityProgress(rows, today);
    expect(steps.average).toEqual({ status: "ok", value: 6000, count: 3 });
    expect(steps.days.map((day) => day.value)).toEqual([8000, null, 4000, null, 6000, null, null]);
  });

  it("rounds the steps average to a whole number", () => {
    const rows = [row(today, 1000), row("2026-10-27", 1000), row("2026-10-26", 1001)];
    expect(activityProgress(rows, today).steps.average).toMatchObject({ value: 1000 });
    expect(activityProgress([row(today, 1000), row("2026-10-27", 1001), row("2026-10-26", 1001)], today).steps.average).toMatchObject({ value: 1001 });
  });

  it("ignores dates outside the window, future dates included", () => {
    const rows = [row(today, 6000), row("2026-10-27", 6000), row("2026-10-21", 9999), row("2026-10-29", 9999), row("2026-01-01", 9999)];
    const { steps } = activityProgress(rows, today);
    expect(steps.average).toEqual({ status: "not_enough", count: 2 });
    expect(steps.days.map((day) => day.value)).toEqual([6000, 6000, null, null, null, null, null]);
  });

  it("keeps steps and sleep apart: a row with only one of them counts for that one", () => {
    const rows = [row(today, 5000, null), row("2026-10-27", null, 420), row("2026-10-26", 7000, 480), row("2026-10-25", null, 450), row("2026-10-24", 9000, null)];
    const result = activityProgress(rows, today);
    expect(result.steps.average).toEqual({ status: "ok", value: 7000, count: 3 });
    expect(result.sleep.average).toEqual({ status: "ok", value: 450, count: 3 });
  });

  it("averages sleep in whole minutes", () => {
    const rows = [row(today, null, 450), row("2026-10-27", null, 451), row("2026-10-26", null, 451)];
    expect(activityProgress(rows, today).sleep.average).toEqual({ status: "ok", value: 451, count: 3 });
  });

  it("counts a saved 0 as a value", () => {
    const rows = [row(today, 0), row("2026-10-27", 0), row("2026-10-26", 3000)];
    expect(activityProgress(rows, today).steps.average).toEqual({ status: "ok", value: 1000, count: 3 });
  });

  it("works across a month and year change", () => {
    const { steps } = activityProgress([row("2026-12-31", 1000), row("2027-01-01", 2000), row("2027-01-02", 3000)], "2027-01-03");
    expect(steps.days.map((day) => day.date)).toEqual(["2027-01-03", "2027-01-02", "2027-01-01", "2026-12-31", "2026-12-30", "2026-12-29", "2026-12-28"]);
    expect(steps.average).toEqual({ status: "ok", value: 2000, count: 3 });
  });
});

describe("activityWindowStart", () => {
  it("is the oldest date of the window", () => {
    expect(activityWindowStart(today)).toBe("2026-10-22");
  });
});

describe("formatSleepMinutes", () => {
  it("shows hours and minutes", () => {
    expect(formatSleepMinutes(450)).toBe("7 h 30 min");
    expect(formatSleepMinutes(480)).toBe("8 h 0 min");
    expect(formatSleepMinutes(45)).toBe("0 h 45 min");
    expect(formatSleepMinutes(0)).toBe("0 h 0 min");
    expect(formatSleepMinutes(1440)).toBe("24 h 0 min");
  });
});
