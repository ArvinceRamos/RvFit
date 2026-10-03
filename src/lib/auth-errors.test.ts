import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./auth-errors";

describe("authErrorMessage", () => {
  it("explains unconfirmed email", () => {
    expect(authErrorMessage("Email not confirmed")).toBe("Confirm your email before logging in.");
  });

  it("keeps wrong-password errors clear", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe("Email or password is incorrect.");
  });

  it("explains the minimum password length", () => {
    expect(authErrorMessage("Password should be at least 8 characters")).toBe("Password must be at least 8 characters long.");
  });
});
