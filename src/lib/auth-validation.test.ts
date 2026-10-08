import { describe, expect, it } from "vitest";
import { confirmMismatch, passwordMismatchMessage, passwordTooShortMessage, validateNewPassword } from "./auth-validation";

describe("validateNewPassword", () => {
  it("needs at least 8 characters first", () => {
    expect(validateNewPassword("short", "short")).toBe(passwordTooShortMessage);
    expect(validateNewPassword("", "")).toBe(passwordTooShortMessage);
  });

  it("needs the confirm field to match", () => {
    expect(validateNewPassword("long-enough", "long-enougH")).toBe(passwordMismatchMessage);
    expect(validateNewPassword("long-enough", "")).toBe(passwordMismatchMessage);
  });

  it("passes a long, matching password", () => {
    expect(validateNewPassword("long-enough", "long-enough")).toBeNull();
    expect(validateNewPassword("12345678", "12345678")).toBeNull();
  });
});

describe("confirmMismatch", () => {
  it("stays quiet until something is typed in the confirm field", () => {
    expect(confirmMismatch("long-enough", "")).toBe(false);
  });

  it("flags a different confirm value and clears when it matches", () => {
    expect(confirmMismatch("long-enough", "long")).toBe(true);
    expect(confirmMismatch("long-enough", "long-enough")).toBe(false);
  });
});
