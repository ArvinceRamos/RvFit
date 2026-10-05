import { describe, expect, it } from "vitest";
import {
  allergenNotice,
  availableAllergyTags,
  diffAvoidedFoods,
  trainingDayOptions,
  validatePreferences,
} from "./preferences";

const foodId = "0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11";
const otherFoodId = "7c1d2a90-3a4b-4c55-8e66-1a2b3c4d5e6f";
const offered = ["dairy", "egg", "fish"];

const valid = {
  allergyTags: ["dairy"],
  avoidedFoodIds: [foodId],
  experience: "beginner",
  equipment: "gym",
  trainingDays: 3,
};

describe("allergen notice", () => {
  it("uses the exact required wording", () => {
    expect(allergenNotice).toBe(
      "Only these allergens are filtered. Other allergens are not filtered, so always check food labels.",
    );
  });
});

describe("availableAllergyTags", () => {
  it("offers only tags that appear on a catalog food, in a fixed order", () => {
    expect(availableAllergyTags([["fish"], [], null, ["dairy", "fish"]])).toEqual(["fish", "dairy"]);
  });

  it("offers nothing for an empty catalog", () => {
    expect(availableAllergyTags([])).toEqual([]);
  });

  it("ignores values that are not allowed diet tags", () => {
    expect(availableAllergyTags([["nightshade", "egg"]])).toEqual(["egg"]);
  });
});

describe("trainingDayOptions", () => {
  it("allows 2 to 4 days for a beginner", () => {
    expect(trainingDayOptions("beginner")).toEqual([2, 3, 4]);
  });

  it("allows 2 to 6 days for an intermediate user", () => {
    expect(trainingDayOptions("intermediate")).toEqual([2, 3, 4, 5, 6]);
  });
});

describe("validatePreferences", () => {
  it("accepts valid preferences", () => {
    expect(validatePreferences(valid, offered)).toEqual({
      ok: true,
      data: {
        allergy_tags: ["dairy"],
        avoided_food_ids: [foodId],
        experience: "beginner",
        equipment: "gym",
        training_days: 3,
      },
    });
  });

  it("removes duplicate tags and foods", () => {
    const result = validatePreferences(
      { ...valid, allergyTags: ["egg", "egg"], avoidedFoodIds: [foodId, foodId] },
      offered,
    );
    expect(result).toMatchObject({ ok: true, data: { allergy_tags: ["egg"], avoided_food_ids: [foodId] } });
  });

  it("rejects an allergy tag the catalog does not offer", () => {
    expect(validatePreferences({ ...valid, allergyTags: ["sesame"] }, offered)).toMatchObject({ ok: false });
  });

  it("rejects an avoided food that is not a valid id", () => {
    expect(validatePreferences({ ...valid, avoidedFoodIds: ["chicken"] }, offered)).toMatchObject({ ok: false });
  });

  it("rejects 5 training days for a beginner", () => {
    expect(validatePreferences({ ...valid, trainingDays: 5 }, offered)).toMatchObject({ ok: false });
  });

  it("accepts 6 training days for an intermediate user", () => {
    expect(validatePreferences({ ...valid, experience: "intermediate", trainingDays: 6 }, offered)).toMatchObject({
      ok: true,
    });
  });

  it("rejects 1 training day and fractional days", () => {
    expect(validatePreferences({ ...valid, trainingDays: 1 }, offered)).toMatchObject({ ok: false });
    expect(validatePreferences({ ...valid, trainingDays: 2.5 }, offered)).toMatchObject({ ok: false });
  });

  it("rejects text training days", () => {
    expect(validatePreferences({ ...valid, trainingDays: "3" }, offered)).toMatchObject({ ok: false });
  });

  it("rejects unknown experience and equipment", () => {
    expect(validatePreferences({ ...valid, experience: "advanced" }, offered)).toMatchObject({ ok: false });
    expect(validatePreferences({ ...valid, equipment: "cables" }, offered)).toMatchObject({ ok: false });
  });

  it("rejects input that is not an object or has wrong field types", () => {
    expect(validatePreferences(null, offered)).toMatchObject({ ok: false });
    expect(validatePreferences({ ...valid, allergyTags: "dairy" }, offered)).toMatchObject({ ok: false });
    expect(validatePreferences({ ...valid, avoidedFoodIds: [1] }, offered)).toMatchObject({ ok: false });
  });
});

describe("diffAvoidedFoods", () => {
  it("finds foods to add and remove", () => {
    expect(diffAvoidedFoods([foodId], [otherFoodId])).toEqual({ toAdd: [otherFoodId], toRemove: [foodId] });
  });

  it("finds nothing to change when the lists match", () => {
    expect(diffAvoidedFoods([foodId, otherFoodId], [otherFoodId, foodId])).toEqual({ toAdd: [], toRemove: [] });
  });
});
