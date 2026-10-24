import { describe, expect, it } from "vitest";
import { isActiveNavItem, isActiveSection, signedInNavItems } from "./nav";

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

describe("isActiveSection", () => {
  const section = (label: string) => signedInNavItems.find((item) => item.label === label)!;
  const active = (pathname: string) => signedInNavItems.filter((item) => isActiveSection(pathname, item)).map((item) => item.label);

  it("has the five sections in order", () => {
    expect(signedInNavItems.map((item) => item.label)).toEqual(["Today", "Food", "Train", "Progress", "Me"]);
  });

  it("lights exactly one section on every signed-in page, including pages that moved under a section", () => {
    expect(active("/dashboard")).toEqual(["Today"]);
    expect(active("/week")).toEqual(["Today"]);
    expect(active("/meals/plan")).toEqual(["Food"]);
    expect(active("/foods")).toEqual(["Food"]);
    expect(active("/workouts/log/new")).toEqual(["Train"]);
    expect(active("/progress")).toEqual(["Progress"]);
    expect(active("/profile")).toEqual(["Me"]);
    expect(active("/preferences")).toEqual(["Me"]);
  });

  it("lights nothing on pages outside the app", () => {
    expect(active("/start")).toEqual([]);
    expect(isActiveSection("/foodsx", section("Food"))).toBe(false);
  });
});
