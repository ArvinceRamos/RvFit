import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getUser = vi.fn();
const rpc = vi.fn();
let responses: Record<string, Response>;

const day = 24 * 60 * 60 * 1000;

// Every query on a table resolves to that table's response, whatever filters are chained.
function query(table: string) {
  const builder = {
    select: () => builder,
    order: () => builder,
    limit: () => builder,
    not: () => builder,
    gte: () => builder,
    maybeSingle: () => Promise.resolve(responses[table]),
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(responses[table]).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from: (table: string) => query(table), rpc }),
}));

const { acceptCheckInAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";

// A loss target set 40 days ago with a flat weight for 21 days: the check-in suggests 2,230 - 200, rounded to 50: 2,050 kcal.
function flatWeighIns() {
  const now = Date.now();
  return Array.from({ length: 21 }, (_, i) => ({ weight_kg: "90.00", logged_at: new Date(now - (20 - i) * day - 60_000).toISOString() }));
}

beforeEach(() => {
  getUser.mockReset().mockResolvedValue({ data: { user: { id: userId } }, error: null });
  rpc.mockReset().mockResolvedValue({ data: "new-id", error: null });
  responses = {
    profiles: { data: { sex_formula_branch: "male", preferred_units: "imperial" }, error: null },
    calorie_targets: {
      data: [{
        target_kcal: 2230, goal: "lose", pace: "steady", protein_g: 150, carbs_g: 250, fat_g: 70, fiber_g: 32,
        floor_applied: false, created_at: new Date(Date.now() - 40 * day).toISOString(),
      }],
      error: null,
    },
    body_logs: { data: flatWeighIns(), error: null },
  };
});

describe("acceptCheckInAction", () => {
  it("saves the suggestion as a new target row with the same goal, pace and macro split", async () => {
    await expect(acceptCheckInAction(2050)).resolves.toEqual({ ok: true, kcal: 2050 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("save_profile_and_target", {
      p_profile: { preferred_units: "imperial" },
      p_target: expect.objectContaining({
        source: "calculated", target_kcal: 2050, goal: "lose", pace: "steady", formula_branch: "male",
        protein_g: 150, fat_g: 62, carbs_g: 223, fiber_g: 29,
        calculation_inputs: { check_in: expect.objectContaining({ from_kcal: 2230, change_kcal: -180 }) },
      }),
      p_body_log: null,
    });
  });

  it("refuses a number the check-in no longer suggests", async () => {
    await expect(acceptCheckInAction(1800)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("Reload") });
    responses.body_logs = { data: flatWeighIns().slice(0, 5), error: null };
    await expect(acceptCheckInAction(2050)).resolves.toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses bad input, signed-out users and read errors without saving", async () => {
    await expect(acceptCheckInAction("2050")).resolves.toMatchObject({ ok: false });
    responses.calorie_targets = { data: null, error: { message: "boom" } };
    await expect(acceptCheckInAction(2050)).resolves.toEqual({ ok: false, error: "Your target could not be saved. Please try again." });
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(acceptCheckInAction(2050)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("signed in") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("does not show raw database errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "permission denied for table calorie_targets" } });
    const result = await acceptCheckInAction(2050);
    expect(result).toEqual({ ok: false, error: "Your target could not be saved. Please try again." });
  });
});
