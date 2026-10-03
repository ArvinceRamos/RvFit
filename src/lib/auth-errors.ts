export function authErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("email not confirmed")) return "Confirm your email before logging in.";
  if (normalized.includes("invalid login credentials")) return "Email or password is incorrect.";
  if (normalized.includes("password") && (normalized.includes("8") || normalized.includes("weak"))) {
    return "Password must be at least 8 characters long.";
  }

  return "Something went wrong. Please try again.";
}
