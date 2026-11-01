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

import { addActivity, saveSteps } from "./activity";
import { savePreferences } from "./profile";
import { saveWorkoutLog } from "./workouts";

describe("activity, workout and preference services", () => {
  beforeEach(() => {
    fake.current = fakeSupabase();
  });

  it("saves steps for the given date only, keeping that day's sleep", async () => {
    fake.current!.onTable("daily_activity", { data: null, error: null });
    expect(await saveSteps("2026-11-01", "8000")).toEqual({ ok: true });
    const upsert = fake.current!.calls.find((call) => call.method === "upsert");
    expect(upsert?.args[0]).toMatchObject({ user_id: "user-1", on_date: "2026-11-01", steps: 8000 });
    expect(upsert?.args[0]).not.toHaveProperty("sleep_minutes");
  });

  it("refuses a bad date and invalid steps", async () => {
    expect(await saveSteps("yesterday", "8000")).toEqual({ ok: false, error: "Steps details are invalid." });
    expect((await saveSteps("2026-11-01", "-5")).ok).toBe(false);
  });

  it("refuses an activity key that is not in the config list", async () => {
    expect((await addActivity("2026-11-01", "skydiving", "30")).ok).toBe(false);
    expect(fake.current!.client.from).not.toHaveBeenCalled();
  });

  it("refuses a new workout when the plan no longer matches Preferences", async () => {
    fake.current!.onTable("user_preferences", { data: { experience: "beginner", equipment: "gym", training_days: 3 }, error: null });
    const result = await saveWorkoutLog({ logId: null, templateKey: "some-other-plan", dayKey: "a", date: "2026-11-01", entries: [] });
    expect(result).toEqual({ ok: false, error: "That plan no longer matches your Preferences. Go back and open it again." });
    expect(fake.current!.rpcCalls).toHaveLength(0);
  });

  it("saves nothing when the catalog cannot be read, so allergies are never skipped", async () => {
    fake.current!.onTable("foods", { data: null, error: { message: "down" } });
    const result = await savePreferences({ allergyTags: ["peanuts"], avoidedFoodIds: [], experience: "beginner", equipment: "gym", trainingDays: 3 });
    expect(result).toEqual({ ok: false, error: "Your preferences could not be saved. Please try again." });
    expect(fake.current!.calls.some((call) => call.table === "user_preferences")).toBe(false);
  });
});
