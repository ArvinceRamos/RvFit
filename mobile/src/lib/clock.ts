import { FALLBACK_TIME_ZONE, minutesSinceMidnightIn, readTimeZone, todayIn } from "@/lib/time-zone";

// The phone's own clock and time zone. The web server reads the time zone from a cookie
// (src/lib/request-clock.ts); here it comes straight from the device.
export type Clock = { timeZone: string; today: string; now: number; minutes: number };

export function deviceTimeZone(): string {
  try {
    return readTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone) ?? FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function clockNow(): Clock {
  const timeZone = deviceTimeZone();
  const now = Date.now();
  return { timeZone, now, today: todayIn(timeZone, new Date(now)), minutes: minutesSinceMidnightIn(timeZone, new Date(now)) };
}
