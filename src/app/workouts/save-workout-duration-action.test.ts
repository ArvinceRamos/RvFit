import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getClaims = vi.fn();
const rpc = vi.fn();
const refresh = vi.fn();
let responses: Record<string, Response> = {};

function query(table: string) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: () => Promise.resolve(responses[table]),
    then: (resolve: (value: Response) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(responses[table]).then(resolve, reject),
  };
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getClaims }, from: (table: string) => query(table), rpc }),
}));
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const { saveWorkoutLogAction } = await import("./actions");
const { planForLog } = await import("@/lib/workouts/log");

const userId = "11111111-2222-4333-8444-555555555555";
const logId = "22222222-3333-4444-8555-666666666666";
const templateKey = "full-body-abc.beginner.gym";
const day = planForLog(templateKey, [])!.days[0];
const slot = day.slots[0];

function workout(extra: Record<string, unknown> = {}) {
  return {
    logId: null,
    templateKey,
    dayKey: day.key,
    date: "2026-10-28",
    units: "metric",
    entries: [{ slotKey: slot.key, exerciseKey: slot.exercise.key, sets: [{ amount: "10", weight: "" }] }],
    ...extra,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getClaims.mockResolvedValue({ data: { claims: { sub: userId } }, error: null });
  rpc.mockResolvedValue({ data: "saved-log-id", error: null });
  responses = {
    user_preferences: { data: { experience: "beginner", equipment: "gym", training_days: 3 }, error: null },
    profiles: { data: { preferred_units: "metric" }, error: null },
    user_exercise_swaps: { data: [], error: null },
    workout_logs: {
      data: {
        id: logId,
        template_key: templateKey,
        day_key: day.key,
        performed_on: "2026-10-27",
        duration_min: 45,
        workout_log_sets: [{ slot_key: slot.key, exercise_key: slot.exercise.key, set_number: 1, reps: 10, seconds: null, weight_kg: null }],
      },
      error: null,
    },
  };
});

describe("saveWorkoutLogAction duration", () => {
  it("passes a typed duration to the save function as p_duration_min", async () => {
    await expect(saveWorkoutLogAction(workout({ duration: " 45 " }))).resolves.toEqual({ ok: true, logId: "saved-log-id" });
    expect(rpc).toHaveBeenCalledWith("save_workout_log", expect.objectContaining({ p_duration_min: 45 }));
  });

  it("passes null for a blank duration or no duration field", async () => {
    await saveWorkoutLogAction(workout({ duration: "" }));
    expect(rpc).toHaveBeenLastCalledWith("save_workout_log", expect.objectContaining({ p_duration_min: null }));
    await saveWorkoutLogAction(workout());
    expect(rpc).toHaveBeenLastCalledWith("save_workout_log", expect.objectContaining({ p_duration_min: null }));
  });

  it("refuses a bad duration before saving", async () => {
    expect(await saveWorkoutLogAction(workout({ duration: "45.5" }))).toEqual({ ok: false, error: "Duration must be a whole number." });
    expect(await saveWorkoutLogAction(workout({ duration: "0" }))).toEqual({ ok: false, error: "Duration must be between 1 and 600 minutes." });
    expect(await saveWorkoutLogAction(workout({ duration: "601" }))).toEqual({ ok: false, error: "Duration must be between 1 and 600 minutes." });
    expect(await saveWorkoutLogAction(workout({ duration: 45 }))).toEqual({ ok: false, error: "Workout details are invalid." });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("sends the changed or cleared duration when editing a saved workout", async () => {
    await saveWorkoutLogAction(workout({ logId, duration: "50" }));
    expect(rpc).toHaveBeenLastCalledWith("save_workout_log", expect.objectContaining({ p_log_id: logId, p_duration_min: 50, p_save_key: null }));
    await saveWorkoutLogAction(workout({ logId, duration: "" }));
    expect(rpc).toHaveBeenLastCalledWith("save_workout_log", expect.objectContaining({ p_log_id: logId, p_duration_min: null }));
  });
});
