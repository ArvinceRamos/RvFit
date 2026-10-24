// The user's time zone, so signed-in pages can be rendered on the server with the user's "today".
// The browser saves its IANA time zone (for example "Asia/Manila") in this cookie: the root layout's
// inline script sets it on every page load, and TimeZoneSync refreshes the page when the server used a
// different one. Kept free of Next and the DOM so it can be tested.

export const TIME_ZONE_COOKIE = "rvfit-tz";

// Used when the cookie is missing or not a real time zone. TimeZoneSync then corrects the page.
export const FALLBACK_TIME_ZONE = "UTC";

export function readTimeZone(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) return null;
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: value }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

// The calendar date ("YYYY-MM-DD") at this moment in the time zone.
export function todayIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

// A year, the whole site, never sent to other sites.
const COOKIE_ATTRIBUTES = ";path=/;max-age=31536000;samesite=lax";

// The cookie as document.cookie takes it, for TimeZoneSync.
export function timeZoneCookie(timeZone: string): string {
  return `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}${COOKIE_ATTRIBUTES}`;
}

// The same cookie from the root layout's inline script, which runs before the page's own code.
export function timeZoneCookieScript(): string {
  return `try{document.cookie="${TIME_ZONE_COOKIE}="+encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)+"${COOKIE_ATTRIBUTES}"}catch(e){}`;
}
