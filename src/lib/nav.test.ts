import { describe, expect, it } from "vitest";
import { activeNavLabel, isActiveNavItem, signedInNavItems } from "./nav";

describe("isActiveNavItem", () => {
  it("is active on the exact path", () => {
    expect(isActiveNavItem("/meals", "/meals")).toBe(true);
  });

  it("is active on pages below the path", () => {
    expect(isActiveNavItem("/meals/new", "/meals")).toBe(true);
    expect(isActiveNavItem("/meals/0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11", "/meals")).toBe(true);
  });

  it("is not active on other pages or look-alike paths", () => {
    expect(isActiveNavItem("/foods", "/meals")).toBe(false);
    expect(isActiveNavItem("/mealsx", "/meals")).toBe(false);
  });
});

describe("signedInNavItems", () => {
  it("has a unique path and label for every link", () => {
    expect(new Set(signedInNavItems.map((item) => item.href)).size).toBe(signedInNavItems.length);
    expect(new Set(signedInNavItems.map((item) => item.label)).size).toBe(signedInNavItems.length);
  });
});

describe("activeNavLabel", () => {
  it("names the current section, including pages below it", () => {
    expect(activeNavLabel("/workouts/log/new")).toBe("Workouts");
    expect(activeNavLabel("/dashboard")).toBe("Dashboard");
    expect(activeNavLabel("/start")).toBeNull();
  });
});
