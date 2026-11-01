import { describe, expect, it } from "vitest";
import { toAppRoute } from "./routes";

describe("toAppRoute", () => {
  it("maps the web pages the shared setup steps link to", () => {
    expect(toAppRoute("/start")).toBe("/start");
    expect(toAppRoute("/meals/new")).toBe("/meal/new");
    expect(toAppRoute("/preferences")).toBe("/preferences");
    expect(toAppRoute("/progress")).toBe("/progress");
    expect(toAppRoute("/profile")).toBe("/me");
    expect(toAppRoute("/workouts/log/new?day=a")).toBe("/workout/new?day=a");
  });

  it("maps saved meal and workout addresses", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(toAppRoute(`/meals/${id}`)).toBe(`/meal/${id}`);
    expect(toAppRoute(`/workouts/log/${id}`)).toBe(`/workout/${id}`);
  });

  it("falls back to Today for anything unknown", () => {
    expect(toAppRoute("/somewhere")).toBe("/today");
  });
});
