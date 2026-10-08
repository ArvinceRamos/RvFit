import { describe, expect, it } from "vitest";
import { authErrorMessage, expiredLinkMessage, googleNotSetUpMessage } from "./auth-errors";

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

  it("explains rate limits in plain words", () => {
    expect(authErrorMessage("email rate limit exceeded")).toContain("Too many attempts");
    expect(authErrorMessage("For security purposes, you can only request this after 47 seconds.")).toContain("Too many attempts");
  });

  it("explains an expired or missing reset session", () => {
    expect(authErrorMessage("Auth session missing!")).toBe(expiredLinkMessage);
    expect(authErrorMessage("Email link is invalid or has expired")).toBe(expiredLinkMessage);
  });

  it("explains reusing the old password", () => {
    expect(authErrorMessage("New password should be different from the old password.")).toContain("different from your current one");
  });

  it("says when Google sign-in is not set up", () => {
    expect(authErrorMessage("Unsupported provider: provider is not enabled")).toBe(googleNotSetUpMessage);
  });

  it("explains network failures", () => {
    expect(authErrorMessage("Failed to fetch")).toContain("connection");
  });
});
