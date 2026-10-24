import { describe, expect, it } from "vitest";
import { greeting, maxDisplayNameLength, savedDisplayName, validateDisplayName } from "./display-name";

describe("savedDisplayName", () => {
  it("prefers display_name, then Google fields", () => {
    expect(savedDisplayName({ display_name: "Sam Lee", full_name: "Other" })).toBe("Sam Lee");
    expect(savedDisplayName({ full_name: "Ana Cruz" })).toBe("Ana Cruz");
    expect(savedDisplayName({ given_name: "Ben" })).toBe("Ben");
  });
  it("skips blank values and returns empty when there is no name", () => {
    expect(savedDisplayName({ display_name: "  ", name: "Kai" })).toBe("Kai");
    expect(savedDisplayName({})).toBe("");
    expect(savedDisplayName(undefined)).toBe("");
    expect(savedDisplayName({ display_name: 5 })).toBe("");
  });
});

describe("greeting", () => {
  it("uses the first name", () => {
    expect(greeting({ display_name: "Sam  Lee" })).toBe("Welcome back, Sam");
  });
  it("falls back without a name", () => {
    expect(greeting({})).toBe("Welcome back");
  });
});

describe("validateDisplayName", () => {
  it("trims and collapses spaces", () => {
    expect(validateDisplayName("  Sam   Lee ")).toEqual({ ok: true, name: "Sam Lee" });
  });
  it("allows empty to clear the name", () => {
    expect(validateDisplayName("")).toEqual({ ok: true, name: "" });
  });
  it("rejects long and non-string values", () => {
    expect(validateDisplayName("a".repeat(maxDisplayNameLength + 1)).ok).toBe(false);
    expect(validateDisplayName(null).ok).toBe(false);
  });
});
