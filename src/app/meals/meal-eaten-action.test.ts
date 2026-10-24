import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown; count?: number };
const getClaims = vi.fn();
const update = vi.fn();
const refresh = vi.fn();
let response: Response = { data: null, error: null };
let yesterdayResponse: Response = { data: [], error: null };

// A tiny stand-in for the query builder: every chain resolves to the canned response, except the
// Meals page's read of yesterday's foods for "Copy yesterday".
function query() {
  let current = response;
  const builder = {
    select: (columns: string) => {
      current = columns === "meal_items(food_id, grams)" ? yesterdayResponse : response;
      return builder;
    },
    eq: () => builder,
    neq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    update: (values: unknown) => {
      update(values);
      return builder;
    },
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(current).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getClaims }, from: () => query() }) }));

// The real refresh only works inside a running Server Action.
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const { loadDayTotalsAction, setMealEatenAction } = await import("./actions");
const { loadMealDays } = await import("@/lib/meal-days-data");
// The page passes its own signed-in client to the loader.
const client = { from: () => query() } as unknown as Parameters<typeof loadMealDays>[0];

const userId = "11111111-2222-4333-8444-555555555555";
const mealId = "66666666-7777-4888-8999-000000000000";
const food = { kcal_per_100g: "100", protein_g_per_100g: "10", carbs_g_per_100g: "20", fat_g_per_100g: "5", fiber_g_per_100g: "1" };

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ data: { claims: { sub: userId } }, error: null });
});

describe("setMealEatenAction", () => {
  it("refuses a signed-out caller", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await setMealEatenAction(mealId, true)).toEqual({ ok: false, error: "You must be signed in to update a meal." });
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects a bad meal id or value", async () => {
    expect(await setMealEatenAction("not-a-uuid", true)).toEqual({ ok: false, error: "Meal details are invalid." });
    expect(await setMealEatenAction(mealId, "yes")).toEqual({ ok: false, error: "Meal details are invalid." });
    expect(update).not.toHaveBeenCalled();
  });

  it("ticks and unticks only the eaten flag", async () => {
    response = { data: [{ id: mealId }], error: null };
    expect(await setMealEatenAction(mealId, true)).toEqual({ ok: true });
    // The page re-renders in the same response, so the totals update.
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenLastCalledWith({ eaten: true });
    expect(await setMealEatenAction(mealId, false)).toEqual({ ok: true });
    expect(update).toHaveBeenLastCalledWith({ eaten: false });
  });

  it("reports a meal it cannot see, such as another user's", async () => {
    response = { data: [], error: null };
    expect(await setMealEatenAction(mealId, true)).toEqual({ ok: false, error: "Meal not found." });
  });

  it("reports a database error", async () => {
    response = { data: null, error: { message: "boom" } };
    expect(await setMealEatenAction(mealId, true)).toEqual({ ok: false, error: "The meal could not be updated. Please try again." });
  });
});

describe("loadDayTotalsAction", () => {
  it("counts eaten meals in the totals and keeps planned meals apart, with every label used", async () => {
    response = {
      data: [
        { id: "a", label: "Meal 1", eaten: true, meal_items: [{ grams: "100", foods: food }] },
        { id: "b", label: "Meal 2", eaten: false, meal_items: [{ grams: "300", foods: food }] },
      ],
      error: null,
    };
    const result = await loadDayTotalsAction("2026-10-07", null);
    if (!result.ok) throw new Error("Expected ok");
    expect(result.totals.kcal).toBe(100);
    expect(result.planned.kcal).toBe(300);
    expect(result.usedLabels).toEqual(["Meal 1", "Meal 2"]);
  });
});

describe("loadMealDays", () => {
  it("groups meals into days with food names and grams", async () => {
    response = {
      data: [
        { id: "a", label: "Meal 1", meal_date: "2026-10-08", from_plan: true, eaten: false, meal_items: [{ grams: "150.00", foods: { ...food, name: "Rice" } }] },
        { id: "b", label: "Meal 2", meal_date: "2026-10-08", from_plan: true, eaten: false, meal_items: [{ grams: "50", foods: { ...food, name: "Chicken" } }] },
      ],
      error: null,
    };
    const result = await loadMealDays(client, "upcoming", "2026-10-07");
    if (!result.ok) throw new Error("Expected ok");
    expect(result.days).toHaveLength(1);
    expect(result.days[0].meals[0].items).toEqual([{ name: "Rice", grams: 150 }]);
    expect(result.days[0].planned_kcal).toBe(200);
    expect(result.days[0].eaten.kcal).toBe(0);
  });

  it("counts yesterday's meals not on today yet, for the Today view only", async () => {
    response = { data: [], error: null };
    yesterdayResponse = { data: [{ meal_items: [{ food_id: "egg", grams: "100" }] }, { meal_items: [{ food_id: "rice", grams: "150" }] }], error: null };
    expect(await loadMealDays(client, "today", "2026-10-07")).toEqual({ ok: true, days: [], yesterdayToCopy: 2 });
    expect(await loadMealDays(client, "past", "2026-10-07")).toEqual({ ok: true, days: [], yesterdayToCopy: 0 });

    // Today already has the egg meal (same foods and grams), so only the rice meal is left to copy.
    response = { data: [{ id: "c", label: "Meal 1", meal_date: "2026-10-07", from_plan: false, eaten: false, meal_items: [{ food_id: "egg", grams: "100.00", foods: { ...food, name: "Egg" } }] }], error: null };
    const result = await loadMealDays(client, "today", "2026-10-07");
    expect(result.ok && result.yesterdayToCopy).toBe(1);
    yesterdayResponse = { data: null, error: { message: "boom" } };
    expect(await loadMealDays(client, "today", "2026-10-07")).toMatchObject({ ok: true, yesterdayToCopy: 0 });
  });

  it("fails when meals cannot be read", async () => {
    response = { data: null, error: { message: "boom" } };
    expect(await loadMealDays(client, "past", "2026-10-07")).toEqual({ ok: false });
  });
});
