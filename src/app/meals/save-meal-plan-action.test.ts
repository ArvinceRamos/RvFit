import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getUser = vi.fn();
const rpc = vi.fn();
let tables: Record<string, Response> = {};

// A tiny stand-in for the query builder: every chain resolves to the table's canned response.
function query(table: string) {
  const result = () => Promise.resolve(tables[table]);
  const builder = {
    select: () => builder,
    in: () => builder,
    gte: () => builder,
    lte: () => builder,
    order: () => builder,
    maybeSingle: result,
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => result().then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: (table: string) => query(table), rpc }),
}));

const { loadPlanDaysAction, saveMealPlanAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const chicken = "11111111-1111-4111-8111-111111111111";
const rice = "33333333-3333-4333-8333-333333333333";
const whey = "55555555-5555-4555-8555-555555555555";

const plan = {
  meals: [
    { date: "2026-10-08", label: "Meal 1", items: [{ foodId: chicken, grams: 150, kcal: 1 }, { foodId: rice, grams: 250 }] },
    { date: "2026-10-08", label: "Meal 2", items: [{ foodId: whey, grams: 40 }], totals: { kcal: 1 } },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  tables = {
    foods: {
      data: [
        { id: chicken, name: "Chicken breast", role: "protein", diet_tags: ["meat"], portion_class: "meat_fish_cooked" },
        { id: rice, name: "Rice", role: "carb", diet_tags: [], portion_class: "grain_cooked" },
        { id: whey, name: "Whey protein powder", role: "protein", diet_tags: ["dairy"], portion_class: "powder" },
      ],
      error: null,
    },
    user_preferences: { data: { allergy_tags: [] }, error: null },
    user_avoided_foods: { data: [], error: null },
    meals: { data: [{ meal_date: "2026-10-08", label: "Meal 3" }], error: null },
  };
  rpc.mockResolvedValue({ data: ["m1", "m2"], error: null });
});

describe("saveMealPlanAction", () => {
  it("refuses a signed-out caller", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await saveMealPlanAction(plan)).toEqual({ ok: false, error: "You must be signed in to save a meal plan." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves only dates, labels, food ids, and grams", async () => {
    expect(await saveMealPlanAction(plan)).toEqual({ ok: true, mealIds: ["m1", "m2"] });
    expect(rpc).toHaveBeenCalledWith("save_meal_plan", {
      p_meals: [
        { meal_date: "2026-10-08", label: "Meal 1", items: [{ food_id: chicken, grams: 150 }, { food_id: rice, grams: 250 }] },
        { meal_date: "2026-10-08", label: "Meal 2", items: [{ food_id: whey, grams: 40 }] },
      ],
    });
  });

  it("returns validation errors without saving", async () => {
    expect(await saveMealPlanAction({ meals: [] })).toEqual({ ok: false, error: "The plan has no meals to save." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects foods excluded by saved preferences", async () => {
    tables.user_preferences = { data: { allergy_tags: ["dairy"] }, error: null };
    expect(await saveMealPlanAction(plan)).toEqual({
      ok: false,
      error: "Whey protein powder matches an allergy or avoided food in your preferences.",
    });
    tables.user_preferences = { data: null, error: null };
    tables.user_avoided_foods = { data: [{ food_id: rice }], error: null };
    expect(await saveMealPlanAction(plan)).toMatchObject({ ok: false, error: "Rice matches an allergy or avoided food in your preferences." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("saves nothing when preferences cannot be read", async () => {
    tables.user_avoided_foods = { data: null, error: { message: "boom" } };
    expect(await saveMealPlanAction(plan)).toEqual({ ok: false, error: "Your plan could not be saved. Please try again." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a label already used on that date", async () => {
    tables.meals = { data: [{ meal_date: "2026-10-08", label: "Meal 2" }], error: null };
    expect(await saveMealPlanAction(plan)).toEqual({
      ok: false,
      error: "Meal 2 is already used on 2026-10-08. Nothing was saved. Make a new plan to use the free labels.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("shows a friendly message when the database finds a label clash", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    expect(await saveMealPlanAction(plan)).toEqual({
      ok: false,
      error: "A meal label in this plan is already used on that day. Nothing was saved. Make a new plan to use the free labels.",
    });
  });

  it("reports other save errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23503" } });
    expect(await saveMealPlanAction(plan)).toEqual({ ok: false, error: "Your plan could not be saved. Please try again." });
  });
});

describe("loadPlanDaysAction", () => {
  const food = (protein: number, fiber: number | null) => ({
    kcal_per_100g: "100",
    protein_g_per_100g: String(protein),
    carbs_g_per_100g: "10",
    fat_g_per_100g: "1",
    fiber_g_per_100g: fiber === null ? null : String(fiber),
  });

  it("refuses a signed-out caller and bad inputs", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await loadPlanDaysAction("2026-10-08", 7)).toEqual({ ok: false });
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    expect(await loadPlanDaysAction("2026-02-30", 1)).toEqual({ ok: false });
    expect(await loadPlanDaysAction("2026-10-08", 8)).toEqual({ ok: false });
    expect(await loadPlanDaysAction("2026-10-08", 1.5)).toEqual({ ok: false });
  });

  it("groups logged meals by date with their labels and totals", async () => {
    tables.meals = {
      data: [
        { id: "a", label: "Meal 1", meal_date: "2026-10-08", meal_items: [{ grams: "100", foods: food(20, 1) }] },
        { id: "b", label: "Meal 3", meal_date: "2026-10-08", meal_items: [{ grams: "200", foods: food(10, null) }] },
        { id: "c", label: "Meal 2", meal_date: "2026-10-10", meal_items: [{ grams: "50", foods: food(20, 2) }] },
      ],
      error: null,
    };
    const result = await loadPlanDaysAction("2026-10-08", 7);
    if (!result.ok) throw new Error("Expected ok");
    expect(Object.keys(result.logged)).toEqual(["2026-10-08", "2026-10-10"]);
    expect(result.logged["2026-10-08"].labels).toEqual(["Meal 1", "Meal 3"]);
    expect(result.logged["2026-10-08"].totals).toMatchObject({ kcal: 300, protein_g: 40, fiber_incomplete: true, fiber_g: null });
    expect(result.logged["2026-10-10"].totals).toMatchObject({ kcal: 50, protein_g: 10, fiber_g: 1, fiber_incomplete: false });
  });

  it("fails when meals cannot be read", async () => {
    tables.meals = { data: null, error: { message: "boom" } };
    expect(await loadPlanDaysAction("2026-10-08", 1)).toEqual({ ok: false });
  });
});
