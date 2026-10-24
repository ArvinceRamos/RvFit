import { describe, expect, it } from "vitest";
import { escapeLikePattern, foodsHref, formatFiber, formatMeasures, readFoodFilters, searchStem, suggestFoods } from "./food-catalog";

describe("readFoodFilters", () => {
  it("reads a valid search, role, and state", () => {
    expect(readFoodFilters({ q: "  chicken ", role: "protein", state: "raw" })).toEqual({
      q: "chicken",
      role: "protein",
      state: "raw",
      limit: 20,
    });
  });

  it("ignores unknown roles and states", () => {
    expect(readFoodFilters({ role: "dessert", state: "fried" })).toEqual({ q: "", role: null, state: null, limit: 20 });
  });

  it("uses the first value when a parameter repeats", () => {
    expect(readFoodFilters({ q: ["rice", "oats"], role: ["carb", "fat"] })).toMatchObject({ q: "rice", role: "carb" });
  });

  it("limits the search text length", () => {
    expect(readFoodFilters({ q: "a".repeat(200) }).q).toHaveLength(60);
  });
});

describe("food list limit", () => {
  it("defaults to 20 and accepts a larger whole number", () => {
    expect(readFoodFilters({}).limit).toBe(20);
    expect(readFoodFilters({ limit: "40" }).limit).toBe(40);
  });

  it("ignores values below 20, fractions, and text", () => {
    expect(readFoodFilters({ limit: "5" }).limit).toBe(20);
    expect(readFoodFilters({ limit: "30.5" }).limit).toBe(20);
    expect(readFoodFilters({ limit: "lots" }).limit).toBe(20);
  });

  it("caps the limit at 500", () => {
    expect(readFoodFilters({ limit: "100000" }).limit).toBe(500);
  });
});

describe("foodsHref", () => {
  it("keeps the active filters and sets the limit", () => {
    expect(foodsHref({ q: "rice", role: "carb", state: "cooked", limit: 20 }, 40)).toBe("/foods?q=rice&role=carb&state=cooked&limit=40");
  });

  it("leaves out empty filters", () => {
    expect(foodsHref({ q: "", role: null, state: null, limit: 20 }, 40)).toBe("/foods?limit=40");
  });
});

describe("suggestFoods", () => {
  const foods = [
    { name: "Sweet potato, baked" },
    { name: "Potato, baked" },
    { name: "Mashed Potato" },
    { name: "Rice, white" },
  ];

  it("returns nothing for blank text", () => {
    expect(suggestFoods(foods, "   ")).toEqual([]);
  });

  it("ranks names that start with the text first, then word starts, then other matches", () => {
    expect(suggestFoods(foods, "pot").map((food) => food.name)).toEqual([
      "Potato, baked",
      "Mashed Potato",
      "Sweet potato, baked",
    ]);
  });

  it("ignores case and surrounding spaces", () => {
    expect(suggestFoods(foods, "  RICE ").map((food) => food.name)).toEqual(["Rice, white"]);
  });

  it("finds a match in the middle of a word", () => {
    expect(suggestFoods(foods, "tato, b").map((food) => food.name)).toEqual(["Potato, baked", "Sweet potato, baked"]);
  });

  it("limits the number of suggestions", () => {
    expect(suggestFoods(foods, "o", 2)).toHaveLength(2);
  });

  it("ignores plural endings", () => {
    const more = [{ name: "Egg, whole" }, { name: "Tomato, raw" }, { name: "Strawberries" }, { name: "Blueberry" }];
    expect(suggestFoods(more, "eggs").map((food) => food.name)).toEqual(["Egg, whole"]);
    expect(suggestFoods(more, "Tomatoes").map((food) => food.name)).toEqual(["Tomato, raw"]);
    expect(suggestFoods(more, "berries").map((food) => food.name)).toEqual(["Blueberry", "Strawberries"]);
    expect(suggestFoods(more, "berry").map((food) => food.name)).toEqual(["Blueberry", "Strawberries"]);
  });
});

describe("searchStem", () => {
  it("drops simple plural endings from the last word", () => {
    expect(searchStem("eggs")).toBe("egg");
    expect(searchStem("potatoes")).toBe("potato");
    expect(searchStem("peaches")).toBe("peach");
    expect(searchStem("grapes")).toBe("grape");
    expect(searchStem("cherries")).toBe("cherr");
    expect(searchStem("chicken breasts")).toBe("chicken breast");
  });

  it("leaves short words and non-plurals alone", () => {
    expect(searchStem(" Rice ")).toBe("rice");
    expect(searchStem("oats")).toBe("oat");
    expect(searchStem("soy")).toBe("soy");
    expect(searchStem("hummus")).toBe("hummus");
    expect(searchStem("glass")).toBe("glass");
    expect(searchStem("turkey")).toBe("turkey");
    expect(searchStem("tato, b")).toBe("tato, b");
  });
});

describe("escapeLikePattern", () => {
  it("escapes LIKE wildcards and backslashes", () => {
    expect(escapeLikePattern("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });

  it("leaves normal text unchanged", () => {
    expect(escapeLikePattern("chicken breast")).toBe("chicken breast");
  });
});

describe("formatFiber", () => {
  it("shows missing fiber as not listed, not zero", () => {
    expect(formatFiber(null)).toBe("Not listed");
  });

  it("shows a real zero as 0.0 g", () => {
    expect(formatFiber(0)).toBe("0.0 g");
  });

  it("shows one decimal place", () => {
    expect(formatFiber(2.46)).toBe("2.5 g");
  });
});

describe("formatMeasures", () => {
  it("joins measures with their gram weights", () => {
    expect(
      formatMeasures([
        { label: "1 cup, chopped or diced", grams: 140 },
        { label: "0.5 breast", grams: 86 },
      ]),
    ).toBe("1 cup, chopped or diced (140 g); 0.5 breast (86 g)");
  });

  it("returns an empty string when there are no measures", () => {
    expect(formatMeasures([])).toBe("");
  });
});
