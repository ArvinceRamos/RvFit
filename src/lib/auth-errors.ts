// Shown on /login?error=oauth, set by /auth/callback when Google sign-in was cancelled or failed.
export const oauthErrorMessage = "Google sign-in was cancelled or did not finish. Try again, or use email and password.";
export const googleNotSetUpMessage = "Google sign-in is not set up yet. Use email and password.";

export const expiredLinkMessage = "This reset link has expired or was opened in a different browser. Request a new one below.";

export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("provider is not enabled") || normalized.includes("unsupported provider")) return googleNotSetUpMessage;
  if (normalized.includes("email not confirmed")) return "Confirm your email before logging in.";
  if (normalized.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (normalized.includes("rate limit") || normalized.includes("only request this after") || normalized.includes("too many requests")) {
    return "Too many attempts. Please wait a minute, then try again.";
  }
  if (normalized.includes("auth session missing") || normalized.includes("session_not_found") || normalized.includes("expired")) {
    return expiredLinkMessage;
  }
  if (normalized.includes("different from the old password") || normalized.includes("same password")) {
    return "Choose a password that is different from your current one.";
  }
  if (normalized.includes("password") && (normalized.includes("8") || normalized.includes("weak"))) {
    return "Password must be at least 8 characters long.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "We could not reach the server. Check your connection and try again.";
  }

  return "Something went wrong. Please try again.";
}
