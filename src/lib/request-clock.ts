// Server-side only: reads the time zone cookie of the current request.
import { cookies } from "next/headers";
import { FALLBACK_TIME_ZONE, readTimeZone, TIME_ZONE_COOKIE, todayIn } from "./time-zone";

export type RequestClock = {
  // The user's IANA time zone, or UTC until the browser has sent it.
  timeZone: string;
  // The user's calendar date ("YYYY-MM-DD") at now.
  today: string;
  // One moment for the whole render, in milliseconds, so the server and browser show the same numbers.
  now: number;
};

export async function requestClock(): Promise<RequestClock> {
  const cookieStore = await cookies();
  const timeZone = readTimeZone(cookieStore.get(TIME_ZONE_COOKIE)?.value) ?? FALLBACK_TIME_ZONE;
  const now = Date.now();
  return { timeZone, today: todayIn(timeZone, new Date(now)), now };
}
