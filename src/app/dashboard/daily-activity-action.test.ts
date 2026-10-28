import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
const getClaims = vi.fn();
const from = vi.fn();
const upsert = vi.fn();
const refresh = vi.fn();
let upsertResponse: { error: unknown } = { error: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims },
    from: (table: string) => {
      from(table);
      return {
        upsert: (values: unknown, options: unknown) => {
          upsert(values, options);
          return Promise.resolve(upsertResponse);
        },
      };
    },
  }),
}));

// The real refresh only works inside a running Server Action.
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const { saveSleepAction, saveStepsAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const today = "2026-10-28";

beforeEach(() => {
  vi.clearAllMocks();
  upsertResponse = { error: null };
  getClaims.mockResolvedValue({ data: { claims: { sub: userId } }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveStepsAction", () => {
  it("refuses a signed-out caller", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await saveStepsAction(today, "8000")).toEqual({ ok: false, error: "You must be signed in to save steps." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a bad date or a non-text value", async () => {
    expect(await saveStepsAction("2026-02-30", "8000")).toEqual({ ok: false, error: "Steps details are invalid." });
    expect(await saveStepsAction(20261028, "8000")).toEqual({ ok: false, error: "Steps details are invalid." });
    expect(await saveStepsAction(today, 8000)).toEqual({ ok: false, error: "Steps details are invalid." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns the validation message", async () => {
    expect(await saveStepsAction(today, "12.5")).toEqual({ ok: false, error: "Steps must be a whole number." });
    expect(await saveStepsAction(today, "100001")).toEqual({ ok: false, error: "Steps must be between 0 and 100000." });
    expect(await saveStepsAction(today, "")).toEqual({ ok: false, error: "Steps is required." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts only the steps on the user's local date, with updated_at", async () => {
    expect(await saveStepsAction(today, " 8500 ")).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("daily_activity");
    const [values, options] = upsert.mock.calls[0];
    expect(Object.keys(values).sort()).toEqual(["on_date", "steps", "updated_at", "user_id"]);
    expect(values).toMatchObject({ user_id: userId, on_date: today, steps: 8500 });
    expect(Number.isNaN(Date.parse(values.updated_at))).toBe(false);
    expect(options).toEqual({ onConflict: "user_id,on_date" });
    // Today re-renders in the same response, so the saved value and Burned today update.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a database error", async () => {
    upsertResponse = { error: { message: "boom" } };
    expect(await saveStepsAction(today, "8000")).toEqual({ ok: false, error: "Your steps could not be saved. Please try again." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("saveSleepAction", () => {
  it("refuses a signed-out caller", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await saveSleepAction(today, "7", "30")).toEqual({ ok: false, error: "You must be signed in to save sleep." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("rejects a bad date or non-text values", async () => {
    expect(await saveSleepAction("yesterday", "7", "30")).toEqual({ ok: false, error: "Sleep details are invalid." });
    expect(await saveSleepAction(today, 7, "30")).toEqual({ ok: false, error: "Sleep details are invalid." });
    expect(await saveSleepAction(today, "7", null)).toEqual({ ok: false, error: "Sleep details are invalid." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("returns the validation message", async () => {
    expect(await saveSleepAction(today, "", "")).toEqual({ ok: false, error: "Enter hours, minutes or both." });
    expect(await saveSleepAction(today, "7", "60")).toEqual({ ok: false, error: "Minutes must be between 0 and 59." });
    expect(await saveSleepAction(today, "24", "30")).toEqual({ ok: false, error: "Sleep must be between 0 and 24 hours." });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts only the sleep minutes on the user's local date, with updated_at", async () => {
    expect(await saveSleepAction(today, "7", "30")).toEqual({ ok: true });
    const [values, options] = upsert.mock.calls[0];
    expect(Object.keys(values).sort()).toEqual(["on_date", "sleep_minutes", "updated_at", "user_id"]);
    expect(values).toMatchObject({ user_id: userId, on_date: today, sleep_minutes: 450 });
    expect(options).toEqual({ onConflict: "user_id,on_date" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a database error", async () => {
    upsertResponse = { error: { message: "boom" } };
    expect(await saveSleepAction(today, "7", "0")).toEqual({ ok: false, error: "Your sleep could not be saved. Please try again." });
  });
});
