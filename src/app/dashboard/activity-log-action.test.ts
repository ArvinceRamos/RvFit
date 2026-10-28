import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked client only. These tests never touch a real account.
type Response = { data: unknown; error: unknown };
const getClaims = vi.fn();
const from = vi.fn();
const insert = vi.fn();
const deleteRows = vi.fn();
const eq = vi.fn();
const refresh = vi.fn();
let insertResponse: Response = { data: null, error: null };
let deleteResponse: Response = { data: [], error: null };

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims },
    from: (table: string) => {
      from(table);
      const builder = {
        insert: (values: unknown) => {
          insert(values);
          return Promise.resolve(insertResponse);
        },
        delete: () => {
          deleteRows();
          return builder;
        },
        eq: (column: string, value: unknown) => {
          eq(column, value);
          return builder;
        },
        select: () => Promise.resolve(deleteResponse),
      };
      return builder;
    },
  }),
}));

// The real refresh only works inside a running Server Action.
vi.mock("next/cache", () => ({ refresh: () => refresh() }));

const { addActivityAction, deleteActivityAction } = await import("./actions");

const userId = "11111111-2222-4333-8444-555555555555";
const activityId = "22222222-3333-4444-8555-666666666666";
const today = "2026-10-28";

beforeEach(() => {
  vi.clearAllMocks();
  insertResponse = { data: null, error: null };
  deleteResponse = { data: [{ id: activityId }], error: null };
  getClaims.mockResolvedValue({ data: { claims: { sub: userId } }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("addActivityAction", () => {
  it("refuses a signed-out caller", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await addActivityAction(today, "cycling", "30")).toEqual({ ok: false, error: "You must be signed in to add an activity." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects a bad date or non-text minutes", async () => {
    expect(await addActivityAction("2026-02-30", "cycling", "30")).toEqual({ ok: false, error: "Activity details are invalid." });
    expect(await addActivityAction(20261028, "cycling", "30")).toEqual({ ok: false, error: "Activity details are invalid." });
    expect(await addActivityAction(today, "cycling", 30)).toEqual({ ok: false, error: "Activity details are invalid." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an unknown key, including walking", async () => {
    const error = "Choose an activity from the list.";
    expect(await addActivityAction(today, "walking", "30")).toEqual({ ok: false, error });
    expect(await addActivityAction(today, "", "30")).toEqual({ ok: false, error });
    expect(await addActivityAction(today, 5, "30")).toEqual({ ok: false, error });
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns the minutes validation message", async () => {
    expect(await addActivityAction(today, "running", "")).toEqual({ ok: false, error: "Minutes is required." });
    expect(await addActivityAction(today, "running", "2.5")).toEqual({ ok: false, error: "Minutes must be a whole number." });
    expect(await addActivityAction(today, "running", "0")).toEqual({ ok: false, error: "Minutes must be between 1 and 600 minutes." });
    expect(await addActivityAction(today, "running", "601")).toEqual({ ok: false, error: "Minutes must be between 1 and 600 minutes." });
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts the caller's row on the local date and refreshes Today", async () => {
    expect(await addActivityAction(today, "running", " 30 ")).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("activity_logs");
    expect(insert).toHaveBeenCalledWith({ user_id: userId, performed_on: today, activity_key: "running", minutes: 30 });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a database error without refreshing", async () => {
    insertResponse = { data: null, error: { message: "boom" } };
    expect(await addActivityAction(today, "running", "30")).toEqual({ ok: false, error: "Your activity could not be saved. Please try again." });
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("deleteActivityAction", () => {
  it("refuses a signed-out caller", async () => {
    getClaims.mockResolvedValue({ data: null, error: null });
    expect(await deleteActivityAction(activityId)).toEqual({ ok: false, error: "You must be signed in to delete an activity." });
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("rejects an id that is not a uuid", async () => {
    expect(await deleteActivityAction("nope")).toEqual({ ok: false, error: "Activity details are invalid." });
    expect(await deleteActivityAction(null)).toEqual({ ok: false, error: "Activity details are invalid." });
    expect(deleteRows).not.toHaveBeenCalled();
  });

  it("deletes only the caller's own row and refreshes Today", async () => {
    expect(await deleteActivityAction(activityId)).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith("activity_logs");
    expect(eq).toHaveBeenCalledWith("id", activityId);
    expect(eq).toHaveBeenCalledWith("user_id", userId);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("says not found when no row was deleted (another user's id)", async () => {
    deleteResponse = { data: [], error: null };
    expect(await deleteActivityAction(activityId)).toEqual({ ok: false, error: "Activity not found." });
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports a database error", async () => {
    deleteResponse = { data: null, error: { message: "boom" } };
    expect(await deleteActivityAction(activityId)).toEqual({ ok: false, error: "The activity could not be deleted. Please try again." });
    expect(refresh).not.toHaveBeenCalled();
  });
});
