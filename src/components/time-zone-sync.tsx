"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readTimeZone, timeZoneCookie, TIME_ZONE_COOKIE } from "@/lib/time-zone";

// Signed-in pages are rendered with the time zone in the rvfit-tz cookie. When the server used another one
// (first visit, cleared cookies, or travel), this saves the device's time zone and renders the page again once
// with the right "today". If cookies are blocked it does nothing, so it can never refresh in a loop.
export function TimeZoneSync({ serverTimeZone }: { serverTimeZone: string }) {
  const router = useRouter();
  useEffect(() => {
    const device = readTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!device || device === serverTimeZone) return;
    document.cookie = timeZoneCookie(device);
    const saved = document.cookie.split("; ").some((cookie) => cookie === `${TIME_ZONE_COOKIE}=${encodeURIComponent(device)}`);
    if (saved) router.refresh();
  }, [router, serverTimeZone]);
  return null;
}
