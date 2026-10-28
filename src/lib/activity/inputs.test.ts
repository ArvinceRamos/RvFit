import { describe, expect, it } from "vitest";
import {
  sleepFields,
  validateActivityKey,
  validateActivityMinutes,
  validateSleep,
  validateSteps,
  validateWorkoutDuration,
} from "./inputs";

describe("validateSteps", () => {
  it("accepts whole numbers from 0 to 100000", () => {
    expect(validateSteps("0")).toEqual({ ok: true, data: 0 });
    expect(validateSteps(" 8500 ")).toEqual({ ok: true, data: 8500 });
    expect(validateSteps("100000")).toEqual({ ok: true, data: 100000 });
  });

  it("rejects blank, fractions, words and out-of-range numbers", () => {
    expect(validateSteps("")).toEqual({ ok: false, error: "Steps is required." });
    expect(validateSteps("12.5")).toEqual({ ok: false, error: "Steps must be a whole number." });
    expect(validateSteps("lots")).toEqual({ ok: false, error: "Steps must be a whole number." });
    expect(validateSteps("-1")).toEqual({ ok: false, error: "Steps must be between 0 and 100000." });
    expect(validateSteps("100001")).toEqual({ ok: false, error: "Steps must be between 0 and 100000." });
  });
});

describe("validateSleep", () => {
  it("turns hours and minutes into minutes", () => {
    expect(validateSleep("7", "30")).toEqual({ ok: true, data: 450 });
    expect(validateSleep("8", "")).toEqual({ ok: true, data: 480 });
    expect(validateSleep("", "45")).toEqual({ ok: true, data: 45 });
    expect(validateSleep("0", "0")).toEqual({ ok: true, data: 0 });
    expect(validateSleep("24", "0")).toEqual({ ok: true, data: 1440 });
  });

  it("needs at least one field", () => {
    expect(validateSleep("", " ")).toEqual({ ok: false, error: "Enter hours, minutes or both." });
  });

  it("rejects fractions, negatives and values past one day", () => {
    expect(validateSleep("7.5", "")).toEqual({ ok: false, error: "Hours must be a whole number." });
    expect(validateSleep("-1", "0")).toEqual({ ok: false, error: "Hours must be between 0 and 24." });
    expect(validateSleep("25", "0")).toEqual({ ok: false, error: "Hours must be between 0 and 24." });
    expect(validateSleep("7", "60")).toEqual({ ok: false, error: "Minutes must be between 0 and 59." });
    expect(validateSleep("24", "30")).toEqual({ ok: false, error: "Sleep must be between 0 and 24 hours." });
  });
});

describe("sleepFields", () => {
  it("splits saved minutes into the form's hours and minutes", () => {
    expect(sleepFields(450)).toEqual({ hours: "7", minutes: "30" });
    expect(sleepFields(480)).toEqual({ hours: "8", minutes: "0" });
    expect(sleepFields(45)).toEqual({ hours: "0", minutes: "45" });
    expect(sleepFields(1440)).toEqual({ hours: "24", minutes: "0" });
  });

  it("gives blank fields when nothing is saved", () => {
    expect(sleepFields(null)).toEqual({ hours: "", minutes: "" });
    expect(sleepFields(Number.NaN)).toEqual({ hours: "", minutes: "" });
  });

  it("round-trips through validateSleep", () => {
    for (const minutes of [0, 1, 59, 60, 451, 1440]) {
      const fields = sleepFields(minutes);
      expect(validateSleep(fields.hours, fields.minutes)).toEqual({ ok: true, data: minutes });
    }
  });
});

describe("validateActivityMinutes", () => {
  it("accepts whole minutes from 1 to 600", () => {
    expect(validateActivityMinutes("1")).toEqual({ ok: true, data: 1 });
    expect(validateActivityMinutes("600")).toEqual({ ok: true, data: 600 });
  });

  it("rejects blank, 0, fractions and over 600", () => {
    expect(validateActivityMinutes("")).toEqual({ ok: false, error: "Minutes is required." });
    expect(validateActivityMinutes("0")).toEqual({ ok: false, error: "Minutes must be between 1 and 600 minutes." });
    expect(validateActivityMinutes("601")).toEqual({ ok: false, error: "Minutes must be between 1 and 600 minutes." });
    expect(validateActivityMinutes("2.5")).toEqual({ ok: false, error: "Minutes must be a whole number." });
  });
});

describe("validateWorkoutDuration", () => {
  it("is optional", () => {
    expect(validateWorkoutDuration("")).toEqual({ ok: true, data: null });
    expect(validateWorkoutDuration("  ")).toEqual({ ok: true, data: null });
  });

  it("accepts whole minutes from 1 to 600", () => {
    expect(validateWorkoutDuration("45")).toEqual({ ok: true, data: 45 });
    expect(validateWorkoutDuration("600")).toEqual({ ok: true, data: 600 });
  });

  it("rejects 0, fractions and over 600", () => {
    expect(validateWorkoutDuration("0")).toEqual({ ok: false, error: "Duration must be between 1 and 600 minutes." });
    expect(validateWorkoutDuration("601")).toEqual({ ok: false, error: "Duration must be between 1 and 600 minutes." });
    expect(validateWorkoutDuration("30.5")).toEqual({ ok: false, error: "Duration must be a whole number." });
  });
});

describe("validateActivityKey", () => {
  it("accepts keys from the config list", () => {
    expect(validateActivityKey("swimming")).toEqual({ ok: true, data: "swimming" });
    expect(validateActivityKey("other_cardio")).toEqual({ ok: true, data: "other_cardio" });
  });

  it("rejects walking, unknown keys and non-strings", () => {
    const error = { ok: false, error: "Choose an activity from the list." };
    expect(validateActivityKey("walking")).toEqual(error);
    expect(validateActivityKey("Cycling")).toEqual(error);
    expect(validateActivityKey(null)).toEqual(error);
    expect(validateActivityKey(7)).toEqual(error);
  });
});
