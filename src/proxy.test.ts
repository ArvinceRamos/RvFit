import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// The matcher only uses exact paths and "/x/:path*", so this small check is enough.
function matches(pathname: string): boolean {
  return config.matcher.some((source) =>
    source.endsWith("/:path*") ? pathname === source.slice(0, -7) || pathname.startsWith(`${source.slice(0, -7)}/`) : pathname === source,
  );
}

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pages(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

const appDir = join(import.meta.dirname, "app");

// "src/app/meals/[id]/page.tsx" becomes "/meals/example".
function routeOf(file: string): string {
  const segments = relative(appDir, file).split(sep).slice(0, -1);
  return `/${segments.map((segment) => (segment.startsWith("[") ? "example" : segment)).join("/")}`;
}

describe("proxy matcher", () => {
  it("covers every page that reads the session on the server, so its token is refreshed and saved", () => {
    const signedIn = pages(appDir).filter((file) => readFileSync(file, "utf8").includes("requireUser"));
    expect(signedIn.length).toBeGreaterThan(10);
    for (const file of signedIn) expect(matches(routeOf(file)), routeOf(file)).toBe(true);
  });

  it("covers log in and sign up, and leaves public pages and the health check alone", () => {
    expect(matches("/login")).toBe(true);
    expect(matches("/signup")).toBe(true);
    for (const path of ["/", "/calculate", "/results", "/privacy", "/terms", "/api/health", "/auth/callback", "/favicon.ico"]) {
      expect(matches(path), path).toBe(false);
    }
  });
});
