"use client";

import { useId, useState } from "react";
import { authErrorMessage, googleNotSetUpMessage } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";

// Shared pieces for the login, sign-up, and password pages.

export function AuthField({ label, autoComplete, onChange, type = "email", value }: {
  label: string;
  autoComplete: string;
  onChange: (value: string) => void;
  type?: "email" | "text";
  value: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        autoComplete={autoComplete}
        className="field mt-2 w-full"
        inputMode={type === "email" ? "email" : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

/** A password input with a Show/Hide button. `autoComplete` is "current-password" or "new-password". */
export function PasswordField({ label, autoComplete, error, hint, minLength, onChange, value }: {
  label: string;
  autoComplete: "current-password" | "new-password";
  // Shown under the field while typing, for example "Passwords don't match."
  error?: string;
  hint?: string;
  minLength?: number;
  onChange: (value: string) => void;
  value: string;
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label className="block text-sm font-semibold" htmlFor={id}>{label}</label>
      <div className="relative mt-2">
        <input
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className="field w-full pr-20"
          id={id}
          minLength={minLength}
          onChange={(event) => onChange(event.target.value)}
          required
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-controls={id}
          aria-pressed={visible}
          className="btn-ghost btn-sm absolute inset-y-1 right-1 !min-h-0"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-muted" id={hintId}>{hint}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-danger" id={errorId} aria-live="polite">{error}</p>}
    </div>
  );
}

/** Announced to screen readers as soon as it appears. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="alert-danger" role="alert">{message}</p>;
}

/** Disabled while pending so a slow network cannot cause a double submit. */
export function SubmitButton({ children, pending, pendingText }: { children: React.ReactNode; pending: boolean; pendingText: string }) {
  return (
    <button
      aria-busy={pending}
      className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? pendingText : children}
    </button>
  );
}

// Google sign-in shows only when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is "true", so the pages work before
// Google credentials exist. See README for the local setup.
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";

/** "or" between the email form and the Google button. */
export function OrDivider() {
  return (
    <div aria-hidden="true" className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

// Asks the local or hosted Supabase Auth whether Google is turned on, so a missing setup shows a
// friendly message instead of the provider's raw error page.
async function googleIsEnabled(): Promise<boolean> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
  });
  if (!response.ok) return false;
  const settings = (await response.json()) as { external?: { google?: boolean } };
  return settings.external?.google === true;
}

/**
 * "Continue with Google". Google sends the user back to /auth/callback, which opens the dashboard,
 * where any targets calculated as a guest in this browser are saved, the same as after email sign-up.
 */
export function GoogleButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function continueWithGoogle() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      if (!(await googleIsEnabled())) {
        setError(googleNotSetUpMessage);
        setPending(false);
        return;
      }
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      // On success the browser leaves for Google, so the button stays pending.
      if (oauthError) {
        setError(authErrorMessage(oauthError.message));
        setPending(false);
      }
    } catch {
      setError(authErrorMessage("Failed to fetch"));
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        aria-busy={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-[14px] border border-line bg-[#fef9f5] px-4 py-2.5 text-sm font-bold text-[#1b1f1d] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={pending}
        onClick={continueWithGoogle}
        type="button"
      >
        <GoogleMark />
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
      <FormError message={error} />
    </div>
  );
}

// The Google "G" in its brand colours, as Google's sign-in branding asks.
function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-[18px] shrink-0" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
