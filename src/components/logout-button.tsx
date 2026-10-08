"use client";

import { useState } from "react";
import { GUEST_DRAFT_STORAGE_KEY } from "@/lib/guest-draft";
import { createClient } from "@/lib/supabase/client";

const defaultClassName = "mt-6 rounded-lg border border-edge bg-field px-4 py-3 font-semibold hover:bg-line";

export function LogoutButton({ className = defaultClassName }: { className?: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function logOut() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      // The session is still active, so say so instead of pretending the user is logged out.
      setPending(false);
      setFailed(true);
      return;
    }
    // Any unsaved guest calculation (age, height, weight) should not stay behind on a shared device.
    try {
      window.localStorage.removeItem(GUEST_DRAFT_STORAGE_KEY);
    } catch {
      // Storage can be blocked; nothing else to clear.
    }
    // A full page load, not router.replace + refresh: the refresh re-rendered the old signed-in page and left a blank screen.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the hard load is deliberate
    window.location.assign("/login");
  }

  return (
    <>
      <button aria-busy={pending} className={`${className} disabled:opacity-60`} disabled={pending} onClick={logOut} type="button">
        {pending ? "Logging out…" : "Log out"}
      </button>
      {failed && <span className="sr-only" role="alert">Could not log out. Check your connection and try again.</span>}
      {failed && <span aria-hidden className="text-xs text-danger">Try again</span>}
    </>
  );
}
