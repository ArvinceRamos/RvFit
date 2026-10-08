// Checks for a new password on sign-up and reset. The 8-character minimum matches
// minimum_password_length in supabase/config.toml.

export const PASSWORD_MIN_LENGTH = 8;
export const passwordTooShortMessage = "Password must be at least 8 characters long.";
export const passwordMismatchMessage = "Passwords don't match.";

// Shown under the confirm field while typing: only once something is typed there and it differs.
export function confirmMismatch(password: string, confirm: string): boolean {
  return confirm.length > 0 && confirm !== password;
}

// Checked on submit. Returns the message to show, or null when the password can be sent.
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) return passwordTooShortMessage;
  if (confirm !== password) return passwordMismatchMessage;
  return null;
}
