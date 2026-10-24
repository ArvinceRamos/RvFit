import { describe, expect, it } from "vitest";
import { pickRecentFoodIds } from "./recent-foods";

describe("pickRecentFoodIds", () => {
  const meals = [{ food_ids: ["egg", "rice"] }, { food_ids: ["rice", "oil", "kale"] }, { food_ids: ["egg", "oats"] }];

  it("keeps the newest-first order without repeats", () => {
    expect(pickRecentFoodIds(meals, [], 10)).toEqual(["egg", "rice", "oil", "kale", "oats"]);
  });

  it("stops at the limit", () => {
    expect(pickRecentFoodIds(meals, [], 3)).toEqual(["egg", "rice", "oil"]);
  });

  it("leaves out avoided foods", () => {
    expect(pickRecentFoodIds(meals, ["rice", "oats"], 10)).toEqual(["egg", "oil", "kale"]);
  });

  it("is empty with no meals", () => {
    expect(pickRecentFoodIds([], [], 8)).toEqual([]);
  });
});
