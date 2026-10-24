import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getClaims = vi.fn();
const rpc = vi.fn();
const update = vi.fn();
let updateResponse: Response;

function query() {
  const builder = {
    update: (values: unknown) => {
      update(values);
      return builder;
    },
    eq: () => builder,
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(updateResponse).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, from: () => query(), rpc }),
}));

const { saveMealAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const foodId = "0b8b8f3e-6f0a-4a43-9d3e-2f6f3c1f9a11";
const meal = { mealId: null, date: "2026-10-24", label: "Meal 1", items: [{ foodId, grams: 150 }] };

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ data: { claims: { sub: userId } }, error: null });
  rpc.mockResolvedValue({ data: "new-meal-id", error: null });
  updateResponse = { data: null, error: null };
});

describe("saveMealAction eaten tick", () => {
  it("sets the tick after saving when the form sends one", async () => {
    await expect(saveMealAction({ ...meal, eaten: true })).resolves.toEqual({ ok: true, mealId: "new-meal-id" });
    expect(update).toHaveBeenCalledWith({ eaten: true });
    await saveMealAction({ ...meal, eaten: false });
    expect(update).toHaveBeenLastCalledWith({ eaten: false });
  });

  it("leaves the tick alone when none is sent", async () => {
    await expect(saveMealAction(meal)).resolves.toEqual({ ok: true, mealId: "new-meal-id" });
    expect(update).not.toHaveBeenCalled();
  });

  it("says the meal is saved when only the tick fails", async () => {
    updateResponse = { data: null, error: { message: "boom" } };
    await expect(saveMealAction({ ...meal, eaten: true })).resolves.toEqual({
      ok: false,
      error: "Meal saved, but it could not be ticked as eaten. Tick it on the Meals page.",
    });
  });

  it("does not tick when the save fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(saveMealAction({ ...meal, eaten: true })).resolves.toMatchObject({ ok: false, error: expect.stringContaining("could not be saved") });
    expect(update).not.toHaveBeenCalled();
  });
});
