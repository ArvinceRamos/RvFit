import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase } from "~/test/fake-supabase";

const fake = vi.hoisted(() => ({ current: null as ReturnType<typeof fakeSupabase> | null }));
vi.mock("~/lib/supabase", () => ({
  get supabase() {
    return fake.current!.client;
  },
  get sharedClient() {
    return fake.current!.client;
  },
}));
vi.mock("@/lib/log", () => ({ logError: vi.fn() }));

import { copyMealDay, deleteMeal, saveMeal, setMealEaten } from "./meals";

const mealId = "11111111-1111-4111-8111-111111111111";
const foodId = "22222222-2222-4222-8222-222222222222";
const validMeal = { mealId: null, date: "2026-11-01", label: "Meal 1", eaten: true, items: [{ foodId, grams: 150 }] };

describe("meal services", () => {
  beforeEach(() => {
    fake.current = fakeSupabase();
  });

  it("refuses to save when signed out", async () => {
    fake.current!.signedOut();
    expect(await saveMeal(validMeal)).toEqual({ ok: false, error: "You must be signed in to save a meal." });
    expect(fake.current!.rpcCalls).toHaveLength(0);
  });

  it("checks the meal with the shared validator before calling the database", async () => {
    const result = await saveMeal({ ...validMeal, items: [] });
    expect(result.ok).toBe(false);
    expect(fake.current!.rpcCalls).toHaveLength(0);
  });

  it("saves through save_meal and then sets the eaten tick", async () => {
    fake.current!.onRpc("save_meal", { data: mealId, error: null });
    fake.current!.onTable("meals", { data: null, error: null });
    expect(await saveMeal(validMeal)).toEqual({ ok: true, mealId });
    expect(fake.current!.rpcCalls[0]).toEqual({
      name: "save_meal",
      args: { p_meal_id: null, p_meal_date: "2026-11-01", p_label: "Meal 1", p_items: [{ food_id: foodId, grams: 150 }] },
    });
    expect(fake.current!.calls.some((call) => call.table === "meals" && call.method === "update")).toBe(true);
  });

  it("explains a label already used on that date", async () => {
    fake.current!.onRpc("save_meal", { data: null, error: { code: "23505", message: "duplicate" } });
    expect(await saveMeal(validMeal)).toEqual({ ok: false, error: "Meal 1 is already used on that date. Choose another label." });
  });

  it("keeps the meal when only the tick fails", async () => {
    fake.current!.onRpc("save_meal", { data: mealId, error: null });
    fake.current!.onTable("meals", { data: null, error: { message: "boom" } });
    expect(await saveMeal(validMeal)).toEqual({ ok: false, error: "Meal saved, but it could not be ticked as eaten. Tick it on the Food page." });
  });

  it("rejects a bad meal ID before deleting", async () => {
    expect(await deleteMeal("not-a-uuid")).toEqual({ ok: false, error: "Meal details are invalid." });
    expect(fake.current!.client.from).not.toHaveBeenCalled();
  });

  it("reports a meal that no longer exists", async () => {
    fake.current!.onTable("meals", { data: [], error: null });
    expect(await deleteMeal(mealId)).toEqual({ ok: false, error: "Meal not found." });
  });

  it("only accepts a true or false tick", async () => {
    expect(await setMealEaten(mealId, "yes")).toEqual({ ok: false, error: "Meal details are invalid." });
  });

  it("does not copy a day onto itself", async () => {
    expect(await copyMealDay("2026-11-01", "2026-11-01")).toEqual({ ok: false, error: "Meal details are invalid." });
  });

  it("says when yesterday has nothing to copy", async () => {
    fake.current!.onTable("meals", { data: [], error: null }, { data: [], error: null });
    expect(await copyMealDay("2026-10-31", "2026-11-01")).toEqual({ ok: false, error: "There are no meals to copy." });
  });
});
