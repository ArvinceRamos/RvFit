"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authErrorMessage, googleNotSetUpMessage } from "@/lib/auth-errors";
import { createGoogleNonce, hashGoogleNonce } from "@/lib/google-nonce";
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

// Google sign-in stays opt-in while credentials are being configured. See README for the setup.
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleIdentityScript = "https://accounts.google.com/gsi/client";

type GoogleCredentialResponse = { credential?: string };

type GoogleIdentity = {
  initialize: (configuration: {
    callback: (response: GoogleCredentialResponse) => void;
    client_id: string;
    nonce: string;
    ux_mode: "popup";
  }) => void;
  renderButton: (parent: HTMLElement, options: {
    shape: "rectangular";
    size: "large";
    text: "continue_with";
    theme: "outline";
    width: number;
  }) => void;
};

type GoogleButtonDimensions = {
  height: number;
  scaleX: number;
  scaleY: number;
  width: number;
};

const googleButtonHeight = 40;
const googleButtonMaxWidth = 400;

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentity } };
  }
}

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

/** Loads Google's browser-only script from the log-in or sign-up page. */
function loadGoogleIdentity(): Promise<GoogleIdentity> {
  const identity = window.google?.accounts?.id;
  if (identity) return Promise.resolve(identity);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-rvfit-google-identity="true"]');
    const script = existing ?? document.createElement("script");
    const finishLoading = () => {
      const loadedIdentity = window.google?.accounts?.id;
      if (loadedIdentity) resolve(loadedIdentity);
      else reject(new Error("Google Identity Services did not initialize."));
    };

    script.addEventListener("load", finishLoading, { once: true });
    script.addEventListener("error", () => reject(new Error("Google Identity Services could not load.")), { once: true });

    if (!existing) {
      script.async = true;
      script.dataset.rvfitGoogleIdentity = "true";
      script.src = googleIdentityScript;
      document.head.append(script);
    }
  });
}

/**
 * Uses Google Identity Services in popup mode. The Google page is Google's own UI; the returned ID
 * token is exchanged with Supabase in this browser, so it writes the same session cookies as email login.
 */
export function GoogleButton() {
  const router = useRouter();
  const wrapper = useRef<HTMLDivElement>(null);
  const gisButton = useRef<HTMLDivElement>(null);
  const [identity, setIdentity] = useState<GoogleIdentity>();
  const [dimensions, setDimensions] = useState<GoogleButtonDimensions>();
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  // Google renders a 40px-high iframe. Measure the custom visual button and scale the iframe's
  // container so every pixel of the visible button, including its corners, opens the popup.
  useEffect(() => {
    const element = wrapper.current;
    if (!element) return;

    const measure = () => {
      const { height, width } = element.getBoundingClientRect();
      if (!width || !height) return;
      const googleWidth = Math.min(googleButtonMaxWidth, Math.ceil(width));
      const next = {
        width: googleWidth,
        height: googleButtonHeight,
        scaleX: width / googleWidth,
        scaleY: height / googleButtonHeight,
      };
      setDimensions((current) => (
        current
        && current.width === next.width
        && current.height === next.height
        && current.scaleX === next.scaleX
        && current.scaleY === next.scaleY
          ? current
          : next
      ));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (!identity || !dimensions || !gisButton.current) return;

    gisButton.current.replaceChildren();
    identity.renderButton(gisButton.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: dimensions.width,
    });
    setReady(true);
  }, [dimensions, identity]);

  useEffect(() => {
    let mounted = true;
    const rawNonce = createGoogleNonce();

    async function initializeGoogleButton() {
      if (!googleClientId) {
        setError(googleNotSetUpMessage);
        return;
      }

      let identity: GoogleIdentity;
      try {
        identity = await loadGoogleIdentity();
      } catch {
        return;
      }

      try {
        const nonce = await hashGoogleNonce(rawNonce);
        if (!mounted) return;

        identity.initialize({
          client_id: googleClientId,
          nonce,
          ux_mode: "popup",
          callback: async ({ credential }) => {
            if (!credential) {
              if (mounted) setError("Google did not return a sign-in credential. Try again.");
              return;
            }
            if (mounted) {
              setPending(true);
              setError(undefined);
            }

            try {
              const { error: signInError } = await createClient().auth.signInWithIdToken({
                provider: "google",
                token: credential,
                nonce: rawNonce,
              });
              if (signInError) {
                if (mounted) {
                  setError(authErrorMessage(signInError.message));
                  setPending(false);
                }
                return;
              }

              // Match the existing email and OAuth completion destination.
              router.replace("/dashboard");
              router.refresh();
            } catch {
              if (mounted) {
                setError(authErrorMessage("Failed to fetch"));
                setPending(false);
              }
            }
          },
        });
        setIdentity(identity);
      } catch {
        if (mounted) setError("Google sign-in could not start. Refresh the page and try again, or use email and password.");
      }
    }

    void initializeGoogleButton();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="space-y-3">
      <div aria-busy={!ready || pending} className="google-gis-button relative w-full rounded-[14px]" ref={wrapper}>
        <GoogleButtonVisual />
        <div
          aria-label="Continue with Google"
          className={`absolute inset-0 z-10 overflow-visible opacity-[0.01] ${ready && !pending ? "cursor-pointer" : "pointer-events-none"}`}
          style={{ height: dimensions?.height, width: dimensions?.width, transform: dimensions ? `scale(${dimensions.scaleX}, ${dimensions.scaleY})` : undefined, transformOrigin: "top left" }}
        >
          <div ref={gisButton} />
        </div>
        {!ready && <OAuthGoogleFallbackOverlay onError={setError} />}
      </div>
      <FormError message={error} />
    </div>
  );
}

/** The visible layer is inert; the overlay handles OAuth while GIS loads, then GIS itself. */
function GoogleButtonVisual() {
  return (
    <button
      aria-hidden="true"
      className="google-gis-button-visual btn-secondary w-full gap-3 disabled:cursor-not-allowed disabled:opacity-60 pointer-events-none"
      tabIndex={-1}
      type="button"
    >
      <GoogleMark />
      Continue with Google
    </button>
  );
}

/** Used until GIS is interactive or if its script cannot load; it preserves the existing redirect flow. */
function OAuthGoogleFallbackOverlay({ onError }: { onError: (message?: string) => void }) {
  const [pending, setPending] = useState(false);

  async function continueWithOAuth() {
    if (pending) return;
    setPending(true);
    onError(undefined);
    try {
      if (!(await googleIsEnabled())) {
        onError(googleNotSetUpMessage);
        setPending(false);
        return;
      }
      const { error: oauthError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      // On success the browser leaves for Google, so the button stays pending.
      if (oauthError) {
        onError(authErrorMessage(oauthError.message));
        setPending(false);
      }
    } catch {
      onError(authErrorMessage("Failed to fetch"));
      setPending(false);
    }
  }

  return (
    <button
      aria-busy={pending}
      aria-label="Continue with Google"
      className="btn-secondary w-full gap-3 disabled:cursor-not-allowed disabled:opacity-60 absolute inset-0 z-20 h-full opacity-0"
      disabled={pending}
      onClick={continueWithOAuth}
      type="button"
    >
      <GoogleMark />
      {pending ? "Opening Google…" : "Continue with Google"}
    </button>
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
