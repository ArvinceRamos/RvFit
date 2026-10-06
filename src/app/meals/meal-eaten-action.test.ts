import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getUser = vi.fn();
const update = vi.fn();
let response: Response = { data: null, error: null };

// A tiny stand-in for the query builder: every chain resolves to the canned response.
function query() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    neq: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    update: (values: unknown) => {
      update(values);
      return builder;
    },
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(response).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser }, from: () => query() }) }));

const { loadDayTotalsAction, loadMealDaysAction, setMealEatenAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const mealId = "66666666-7777-4888-8999-000000000000";
const food = { kcal_per_100g: "100", protein_g_per_100g: "10", carbs_g_per_100g: "20", fat_g_per_100g: "5", fiber_g_per_100g: "1" };

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
});

describe("setMealEatenAction", () => {
  it("refuses a signed-out caller", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
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

describe("loadMealDaysAction", () => {
  it("refuses a signed-out caller or a bad date", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await loadMealDaysAction("today", "2026-10-07")).toEqual({ ok: false });
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    expect(await loadMealDaysAction("today", "2026-02-30")).toEqual({ ok: false });
  });

  it("groups meals into days with food names and grams", async () => {
    response = {
      data: [
        { id: "a", label: "Meal 1", meal_date: "2026-10-08", from_plan: true, eaten: false, meal_items: [{ grams: "150.00", foods: { ...food, name: "Rice" } }] },
        { id: "b", label: "Meal 2", meal_date: "2026-10-08", from_plan: true, eaten: false, meal_items: [{ grams: "50", foods: { ...food, name: "Chicken" } }] },
      ],
      error: null,
    };
    const result = await loadMealDaysAction("upcoming", "2026-10-07");
    if (!result.ok) throw new Error("Expected ok");
    expect(result.days).toHaveLength(1);
    expect(result.days[0].meals[0].items).toEqual([{ name: "Rice", grams: 150 }]);
    expect(result.days[0].planned_kcal).toBe(200);
    expect(result.days[0].eaten.kcal).toBe(0);
  });

  it("fails when meals cannot be read", async () => {
    response = { data: null, error: { message: "boom" } };
    expect(await loadMealDaysAction("past", "2026-10-07")).toEqual({ ok: false });
  });
});
