"use client";

import { useSearchParams } from "next/navigation";
import { ACCOUNT_DELETED_NOTICE } from "@/lib/landing-content";

// Shown on the landing page after /profile deletes the account (?account=deleted). Read in the browser,
// so the landing page itself stays static and is served from the CDN.
export function AccountDeletedNotice() {
  if (useSearchParams().get("account") !== "deleted") return null;
  return (
    <p aria-live="polite" className="mb-8 max-w-xl rounded-lg border border-line bg-card p-4 text-sm font-semibold text-ink">{ACCOUNT_DELETED_NOTICE}</p>
  );
}
