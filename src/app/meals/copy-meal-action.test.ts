import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getUser = vi.fn();
const rpc = vi.fn();
let mealResponse: Response;
let labelsResponse: Response;

// The meal is read with maybeSingle(); the day's labels are read as a list.
function query() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(mealResponse),
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(labelsResponse).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: () => query(), rpc }),
}));

const { copyMealToDateAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const mealId = "66666666-7777-4888-8999-000000000000";
const foodId = "0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11";

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  rpc.mockReset().mockResolvedValue({ data: "new-meal-id", error: null });
  mealResponse = { data: { meal_items: [{ food_id: foodId, grams: "150.00" }] }, error: null };
  labelsResponse = { data: [{ label: "Meal 1" }], error: null };
});

describe("copyMealToDateAction", () => {
  it("saves the same foods and grams under the first free label", async () => {
    await expect(copyMealToDateAction(mealId, "2026-10-07")).resolves.toEqual({ ok: true, label: "Meal 2" });
    expect(rpc).toHaveBeenCalledWith("save_meal", {
      p_meal_id: null,
      p_meal_date: "2026-10-07",
      p_label: "Meal 2",
      p_items: [{ food_id: foodId, grams: 150 }],
    });
  });

  it("refuses when all six labels are used that day", async () => {
    labelsResponse = { data: [1, 2, 3, 4, 5, 6].map((n) => ({ label: `Meal ${n}` })), error: null };
    await expect(copyMealToDateAction(mealId, "2026-10-07")).resolves.toEqual({ ok: false, error: "All six meal labels are used on that day." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does nothing for a meal the user cannot read, bad input, or no session", async () => {
    mealResponse = { data: null, error: null };
    await expect(copyMealToDateAction(mealId, "2026-10-07")).resolves.toMatchObject({ ok: false, error: "That meal was not found." });
    await expect(copyMealToDateAction("not-a-uuid", "2026-10-07")).resolves.toMatchObject({ ok: false });
    await expect(copyMealToDateAction(mealId, "2026-02-30")).resolves.toMatchObject({ ok: false });
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(copyMealToDateAction(mealId, "2026-10-07")).resolves.toMatchObject({ ok: false, error: expect.stringContaining("signed in") });
    expect(rpc).not.toHaveBeenCalled();
  });
});
