import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "./format";
import { convertWeightText, formatWeight, logSlots, planForLog, resolveUnits, validateWorkoutLog, weightUnit, type LogRules } from "./log";
import { swapOptions } from "./templates";

const templateKey = "full-body-abc.beginner.gym";
const plan = planForLog(templateKey, [])!;
const dayA = plan.days[0];
const squat = dayA.slots[0]; // leg press, loaded, reps
const core = dayA.slots[3]; // cable crunch, loaded, reps
const metric: LogRules = { units: "metric", swaps: [], savedExercises: new Map() };

function log(entries: unknown, extra: Record<string, unknown> = {}) {
  return { logId: null, templateKey, dayKey: "a", date: "2026-10-06", entries, ...extra };
}

function entry(slotKey: string, exerciseKey: string, sets: [string, string][]) {
  return { slotKey, exerciseKey, sets: sets.map(([amount, weight]) => ({ amount, weight })) };
}

describe("logSlots", () => {
  it("lists every planned slot with the planned exercise first", () => {
    const slots = logSlots(plan, "a", new Map())!;
    expect(slots.map((slot) => slot.slotKey)).toEqual(dayA.slots.map((slot) => slot.key));
    expect(slots[0].choices[0].key).toBe(squat.exercise.key);
    expect(slots[0].plannedSets).toBe(3);
    expect(slots[0].planText).toBe("3 sets × 8–12 reps · Rest 90 s");
    expect(slots[0].choices.map((choice) => choice.key)).toEqual([squat.exercise.key, ...swapOptions(plan, squat.key).map((item) => item.key)]);
  });

  it("carries each exercise's form cue so the log screen can show it", () => {
    const slots = logSlots(plan, "a", new Map())!;
    expect(slots[0].choices[0].cue).toBe(squat.exercise.cue);
    expect(slots.flatMap((slot) => slot.choices).filter((choice) => choice.cue).length).toBeGreaterThan(0);
  });

  it("returns null for an unknown day and keeps a saved exercise that is no longer an option", () => {
    expect(logSlots(plan, "nope", new Map())).toBeNull();
    const slots = logSlots(plan, "a", new Map([[squat.key, "push-up"]]))!;
    expect(slots[0].choices.some((choice) => choice.key === "push-up")).toBe(true);
  });

  it("uses saved swaps as the planned exercise", () => {
    const option = swapOptions(plan, squat.key)[0];
    const swapped = planForLog(templateKey, [{ slotKey: squat.key, exerciseKey: option.key }])!;
    expect(logSlots(swapped, "a", new Map())![0].plannedExerciseKey).toBe(option.key);
  });
});

describe("validateWorkoutLog", () => {
  it("saves filled sets, skips blank rows, and numbers sets from 1", () => {
    const result = validateWorkoutLog(
      log([
        entry(squat.key, "leg-press", [["10", "100"], ["", ""], ["8", "102.5"]]),
        entry(core.key, "plank", [["30", ""]]),
        entry(dayA.slots[1].key, dayA.slots[1].exercise.key, [["", ""], ["", ""]]),
      ]),
      metric,
    );
    expect(result).toEqual({
      ok: true,
      data: {
        log_id: null,
        template_key: templateKey,
        day_key: "a",
        performed_on: "2026-10-06",
        sets: [
          { slot_key: squat.key, exercise_key: "leg-press", set_number: 1, reps: 10, seconds: null, weight_kg: 100 },
          { slot_key: squat.key, exercise_key: "leg-press", set_number: 2, reps: 8, seconds: null, weight_kg: 102.5 },
          { slot_key: core.key, exercise_key: "plank", set_number: 1, reps: null, seconds: 30, weight_kg: null },
        ],
      },
    });
  });

  it("lets a loaded exercise skip the weight", () => {
    const result = validateWorkoutLog(log([entry(squat.key, "leg-press", [["10", ""]])]), metric);
    expect(result).toMatchObject({ ok: true, data: { sets: [{ weight_kg: null }] } });
  });

  it("converts pounds to kilograms with 2 decimals", () => {
    const result = validateWorkoutLog(log([entry(squat.key, "leg-press", [["10", "135"]])]), { ...metric, units: "imperial" });
    expect(result).toMatchObject({ ok: true, data: { sets: [{ weight_kg: 61.23 }] } });
  });

  it("allows a different valid option for one workout, including a dumbbell or bodyweight move in a gym plan", () => {
    expect(validateWorkoutLog(log([entry(squat.key, "goblet-squat", [["10", "20"]])]), metric)).toMatchObject({ ok: true });
    expect(validateWorkoutLog(log([entry(squat.key, "bodyweight-squat", [["12", ""]])]), metric)).toMatchObject({ ok: true });
  });

  it("allows an exercise already saved for the slot when editing, even if no longer an option", () => {
    const raw = log([entry(squat.key, "push-up", [["10", ""]])]);
    expect(validateWorkoutLog(raw, metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(raw, { ...metric, savedExercises: new Map([[squat.key, "push-up"]]) })).toMatchObject({ ok: true });
  });

  it("requires at least one set", () => {
    expect(validateWorkoutLog(log([]), metric)).toEqual({ ok: false, error: "Enter at least one set." });
    expect(validateWorkoutLog(log([entry(squat.key, "leg-press", [["", ""]])]), metric)).toEqual({ ok: false, error: "Enter at least one set." });
  });

  it.each([
    ["0 reps", [["0", ""]], "Reps must be between 1 and 100"],
    ["101 reps", [["101", ""]], "Reps must be between 1 and 100"],
    ["fractional reps", [["8.5", ""]], "whole number"],
    ["text reps", [["ten", ""]], "whole number"],
    ["weight without reps", [["", "50"]], "Enter reps"],
    ["zero weight", [["10", "0"]], "more than 0"],
    ["negative weight", [["10", "-5"]], "more than 0"],
    ["weight over 500 kg", [["10", "500.01"]], "at most 500 kg"],
    ["text weight", [["10", "heavy"]], "must be a number"],
  ])("rejects %s", (_name, sets, message) => {
    const result = validateWorkoutLog(log([entry(squat.key, "leg-press", sets as [string, string][])]), metric);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it("checks seconds for holds and refuses weight on unloaded exercises", () => {
    expect(validateWorkoutLog(log([entry(core.key, "plank", [["601", ""]])]), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log([entry(core.key, "plank", [["600", ""]])]), metric)).toMatchObject({ ok: true });
    const weighted = validateWorkoutLog(log([entry(core.key, "plank", [["30", "10"]])]), metric);
    expect(weighted).toEqual({ ok: false, error: "Plank, set 1: This exercise does not take a weight." });
  });

  it("limits sets per exercise and the imperial weight maximum", () => {
    const eleven = Array.from({ length: 11 }, () => ["10", ""] as [string, string]);
    expect(validateWorkoutLog(log([entry(squat.key, "leg-press", eleven)]), metric)).toMatchObject({ ok: false });
    const heavy = validateWorkoutLog(log([entry(squat.key, "leg-press", [["10", "1200"]])]), { ...metric, units: "imperial" });
    expect(heavy).toEqual({ ok: false, error: "Leg press, set 1: Weight can be at most 1102 lb." });
  });

  it("rejects wrong exercises, duplicate exercises, and duplicate or unknown slots", () => {
    expect(validateWorkoutLog(log([entry(squat.key, "plank", [["10", ""]])]), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log([entry(squat.key, "nope", [["10", ""]])]), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log([entry("nope", "leg-press", [["10", ""]])]), metric)).toMatchObject({ ok: false });
    expect(
      validateWorkoutLog(log([entry(squat.key, "leg-press", [["10", ""]]), entry(squat.key, "leg-press", [["10", ""]])]), metric),
    ).toMatchObject({ ok: false });
    // Two push slots on day C of a 5-day plan cannot both log the same exercise.
    const five = planForLog("ppl-upper-lower.intermediate.gym", [])!;
    const [first, second] = five.days[0].slots.filter((slot) => slot.pattern === "horizontal_push");
    const shared = swapOptions(five, first.key).find((item) => swapOptions(five, second.key).some((other) => other.key === item.key))!;
    expect(
      validateWorkoutLog(
        { logId: null, templateKey: five.key, dayKey: "push", date: "2026-10-06", entries: [entry(first.key, shared.key, [["8", ""]]), entry(second.key, shared.key, [["8", ""]])] },
        metric,
      ),
    ).toMatchObject({ ok: false, error: `${shared.name} is logged twice. Choose a different exercise.` });
  });

  it("rejects bad dates, ids, templates, days, and shapes", () => {
    const sets = [entry(squat.key, "leg-press", [["10", ""]])];
    expect(validateWorkoutLog(log(sets, { date: "2026-02-30" }), metric)).toEqual({ ok: false, error: "Choose a valid date." });
    expect(validateWorkoutLog(log(sets, { date: "" }), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log(sets, { logId: "abc" }), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log(sets, { templateKey: "nope.beginner.gym" }), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log(sets, { dayKey: "z" }), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log("x"), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(log([{ slotKey: squat.key, exerciseKey: "leg-press", sets: [{ amount: 10, weight: "" }] }]), metric)).toMatchObject({ ok: false });
    expect(validateWorkoutLog(null, metric)).toMatchObject({ ok: false });
  });
});

describe("weights and dates", () => {
  it("shows weights in the user's units with one decimal", () => {
    expect(formatWeight(61.23, "imperial")).toBe("135");
    expect(formatWeight(100, "imperial")).toBe("220.5");
    expect(formatWeight(102.5, "metric")).toBe("102.5");
    expect(formatWeight(60, "metric")).toBe("60");
    expect(weightUnit("metric")).toBe("kg");
    expect(weightUnit("imperial")).toBe("lb");
  });

  it("formats a calendar date without shifting the day", () => {
    expect(formatCalendarDate("2026-10-06")).toBe("Oct 6, 2026");
  });
});

describe("kg/lb switch", () => {
  it("converts typed weights to the other unit", () => {
    expect(convertWeightText("135", "imperial", "metric")).toBe("61.23");
    expect(convertWeightText("61.23", "metric", "imperial")).toBe("135");
    expect(convertWeightText("100", "metric", "imperial")).toBe("220.5");
  });

  it("does not drift when switching back and forth", () => {
    const kg = convertWeightText("135", "imperial", "metric");
    expect(convertWeightText(kg, "metric", "imperial")).toBe("135");
  });

  it("leaves blank, unreadable, and unchanged-unit text alone", () => {
    expect(convertWeightText("", "metric", "imperial")).toBe("");
    expect(convertWeightText("  ", "metric", "imperial")).toBe("  ");
    expect(convertWeightText("abc", "metric", "imperial")).toBe("abc");
    expect(convertWeightText("50", "metric", "metric")).toBe("50");
  });

  it("uses the chosen units, falls back to the saved ones, and rejects anything else", () => {
    expect(resolveUnits("imperial", "metric")).toEqual({ ok: true, data: "imperial" });
    expect(resolveUnits("metric", "imperial")).toEqual({ ok: true, data: "metric" });
    expect(resolveUnits(undefined, "imperial")).toEqual({ ok: true, data: "imperial" });
    expect(resolveUnits(null, "metric")).toEqual({ ok: true, data: "metric" });
    expect(resolveUnits("kg", "metric")).toMatchObject({ ok: false });
    expect(resolveUnits(5, "metric")).toMatchObject({ ok: false });
  });
});
