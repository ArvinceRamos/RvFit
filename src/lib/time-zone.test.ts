import { describe, expect, it } from "vitest";
import { readTimeZone, timeZoneCookie, timeZoneCookieScript, TIME_ZONE_COOKIE, todayIn } from "./time-zone";

describe("readTimeZone", () => {
  it("accepts real IANA time zones", () => {
    expect(readTimeZone("Asia/Manila")).toBe("Asia/Manila");
    expect(readTimeZone("America/New_York")).toBe("America/New_York");
    expect(readTimeZone("UTC")).toBe("UTC");
  });

  it("refuses missing, made-up and oversized values", () => {
    expect(readTimeZone(undefined)).toBeNull();
    expect(readTimeZone("")).toBeNull();
    expect(readTimeZone("Mars/Base")).toBeNull();
    expect(readTimeZone("x".repeat(65))).toBeNull();
    expect(readTimeZone(42)).toBeNull();
  });
});

describe("todayIn", () => {
  // 16:30 UTC on 25 October 2026.
  const now = new Date("2026-10-25T16:30:00Z");

  it("gives the calendar date in the user's time zone, not the server's", () => {
    expect(todayIn("UTC", now)).toBe("2026-10-25");
    // Manila is UTC+8, so it is already the 26th there.
    expect(todayIn("Asia/Manila", now)).toBe("2026-10-26");
    // Honolulu is UTC-10, still the 25th.
    expect(todayIn("Pacific/Honolulu", now)).toBe("2026-10-25");
  });

  it("pads months and days", () => {
    expect(todayIn("UTC", new Date("2026-01-05T00:00:00Z"))).toBe("2026-01-05");
  });
});

describe("timeZoneCookie", () => {
  it("encodes the zone and uses the same attributes as the inline script", () => {
    expect(timeZoneCookie("America/Argentina/Buenos_Aires")).toBe("rvfit-tz=America%2FArgentina%2FBuenos_Aires;path=/;max-age=31536000;samesite=lax");
    expect(timeZoneCookieScript()).toContain(";path=/;max-age=31536000;samesite=lax");
  });
});

describe("timeZoneCookieScript", () => {
  it("writes the time zone cookie for the whole site", () => {
    const script = timeZoneCookieScript();
    expect(script).toContain(`${TIME_ZONE_COOKIE}=`);
    expect(script).toContain("path=/");
    expect(script).toContain("samesite=lax");
  });
});
