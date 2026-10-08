import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, logError } from "./log";

afterEach(() => vi.restoreAllMocks());

describe("describeError", () => {
  it("keeps only the code and message of a Supabase error", () => {
    expect(describeError({ code: "23505", message: "duplicate key", details: "Key (user_id)=(abc)", hint: null })).toEqual({
      code: "23505",
      message: "duplicate key",
    });
  });

  it("handles Error objects and plain values", () => {
    expect(describeError(new TypeError("bad"))).toEqual({ name: "TypeError", message: "bad" });
    expect(describeError("oops")).toEqual({ message: "oops" });
  });

  it("cuts very long messages", () => {
    expect(describeError(new Error("x".repeat(1000))).message).toHaveLength(300);
  });
});

describe("logError", () => {
  it("writes one JSON line with the scope and the first real error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("meals.save", null, undefined, { code: "42501", message: "permission denied" });
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toEqual({ level: "error", scope: "meals.save", code: "42501", message: "permission denied" });
  });

  it("still logs when no error object is available", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError("dashboard.load", null);
    expect(JSON.parse(spy.mock.calls[0][0] as string)).toMatchObject({ scope: "dashboard.load", message: "No error details" });
  });
});
