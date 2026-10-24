import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getClaims = vi.fn();
const rpc = vi.fn();
const update = vi.fn();
let fromResponse: Response;
let toResponse: Response;
let updateResponse: Response;

// The copied day (2026-10-23) and the new day are both read with their items.
function query() {
  let response: Response;
  const builder = {
    select: () => builder,
    eq: (_column: string, date: string) => {
      response = date === "2026-10-23" ? fromResponse : toResponse;
      return builder;
    },
    order: () => builder,
    update: (values: unknown) => {
      response = updateResponse;
      return { in: (column: string, ids: unknown) => (update(values, column, ids), builder) };
    },
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(response).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, from: () => query(), rpc }),
}));

// The real refresh only works inside a running Server Action.
vi.mock("next/cache", () => ({ refresh: vi.fn() }));

const { copyMealDayAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const rice = "0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11";
const egg = "1c9c9f4f-7a1b-4b54-8e4f-3a7a4d2a0b22";

beforeEach(() => {
  getClaims.mockReset().mockResolvedValue({ data: { claims: { sub: userId } }, error: null });
  rpc.mockReset().mockResolvedValue({ data: ["a", "b"], error: null });
  update.mockReset();
  fromResponse = {
    data: [
      { label: "Meal 1", meal_items: [{ food_id: egg, grams: "100.00" }] },
      { label: "Meal 3", meal_items: [{ food_id: rice, grams: "150" }, { food_id: egg, grams: "50" }] },
    ],
    error: null,
  };
  toResponse = { data: [{ label: "Meal 1", meal_items: [{ food_id: rice, grams: "80" }] }], error: null };
  updateResponse = { data: null, error: null };
});

describe("copyMealDayAction", () => {
  it("saves every meal in one call, keeping free labels and moving taken ones", async () => {
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toEqual({ ok: true, count: 2 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_meal_plan", {
      p_meals: [
        { meal_date: "2026-10-24", label: "Meal 2", items: [{ food_id: egg, grams: 100 }] },
        { meal_date: "2026-10-24", label: "Meal 3", items: [{ food_id: rice, grams: 150 }, { food_id: egg, grams: 50 }] },
      ],
    });
  });

  it("marks the copies as not from the meal planner", async () => {
    await copyMealDayAction("2026-10-23", "2026-10-24");
    expect(update).toHaveBeenCalledWith({ from_plan: false }, "id", ["a", "b"]);
    // The copies are already saved, so a failed flag update still reports the copy.
    updateResponse = { data: null, error: { message: "boom" } };
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toEqual({ ok: true, count: 2 });
  });

  it("skips meals already copied, and copies nothing on a second press", async () => {
    rpc.mockResolvedValue({ data: ["b"], error: null });
    toResponse = { data: [{ label: "Meal 1", meal_items: [{ food_id: egg, grams: "100" }] }], error: null };
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toEqual({ ok: true, count: 1 });
    expect(rpc).toHaveBeenCalledWith("save_meal_plan", {
      p_meals: [{ meal_date: "2026-10-24", label: "Meal 3", items: [{ food_id: rice, grams: 150 }, { food_id: egg, grams: 50 }] }],
    });

    rpc.mockClear();
    toResponse = {
      data: [
        { label: "Meal 1", meal_items: [{ food_id: egg, grams: "100" }] },
        { label: "Meal 3", meal_items: [{ food_id: egg, grams: "50" }, { food_id: rice, grams: "150" }] },
      ],
      error: null,
    };
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toEqual({ ok: false, error: "Those meals are already on that day, so nothing was copied." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("copies nothing when there are not enough free labels or no meals", async () => {
    toResponse = { data: [1, 2, 3, 4, 5].map((n) => ({ label: `Meal ${n}`, meal_items: [] })), error: null };
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("Nothing was copied") });
    fromResponse = { data: [], error: null };
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toEqual({ ok: false, error: "There are no meals to copy." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("reports a label clash from the database", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23505" } });
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("Nothing was copied") });
    expect(update).not.toHaveBeenCalled();
  });

  it("does nothing for bad input, a read error, or no session", async () => {
    await expect(copyMealDayAction("2026-02-30", "2026-10-24")).resolves.toMatchObject({ ok: false });
    await expect(copyMealDayAction("2026-10-24", "2026-10-24")).resolves.toMatchObject({ ok: false });
    fromResponse = { data: null, error: { message: "boom" } };
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toMatchObject({ ok: false });
    getClaims.mockResolvedValue({ data: null, error: null });
    await expect(copyMealDayAction("2026-10-23", "2026-10-24")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("signed in") });
    expect(rpc).not.toHaveBeenCalled();
  });
});
