import { describe, expect, it, vi } from "vitest";
import { saveInitialGuestDraft, type GuestDraftRpcClient } from "./save-guest-draft";

const draftId = "123e4567-e89b-42d3-a456-426614174000";
const userId = "223e4567-e89b-42d3-a456-426614174000";

function calculatedDraft() {
  return {
    guest_draft_id: draftId,
    adult_confirmed_at: "2026-10-04T00:00:00.000Z",
    setup_inputs: {
      calculate: {
        age: "30", height: "180", feet: "", inches: "", weight: "80", sex: "male",
        activity: "moderate", goal: "maintain", pace: "gradual", units: "metric",
      },
    },
    target: {
      source: "calculated", target_kcal: 1, macros: { protein_g: 128, carbs_g: 200, fat_g: 60, fiber_g: 30 },
    },
  };
}

function manualDraft() {
  return {
    guest_draft_id: draftId,
    adult_confirmed_at: "2026-10-04T00:00:00.000Z",
    setup_inputs: { manual: { target_kcal: "2000", weight: "80", units: "metric" } },
    target: { source: "manual", target_kcal: 1, macros: { protein_g: 128, carbs_g: 200, fat_g: 60, fiber_g: 28 } },
  };
}

function clientWith(status: "saved" | "already_saved" | "saved_target_exists") {
  const rpc = vi.fn().mockResolvedValue({ data: { status }, error: null });
  return { client: { rpc } as unknown as GuestDraftRpcClient, rpc };
}

describe("saveInitialGuestDraft", () => {
  it("recalculates and saves a calculated draft with the signed-in user ID", async () => {
    const { client, rpc } = clientWith("saved");
    await expect(saveInitialGuestDraft(client, userId, calculatedDraft())).resolves.toEqual({ ok: true, status: "saved" });
    expect(rpc).toHaveBeenCalledWith("save_initial_guest_draft", expect.objectContaining({
      p_user_id: userId,
      p_guest_draft_id: draftId,
      p_target: expect.objectContaining({ source: "calculated", target_kcal: 2759 }),
    }));
  });

  it("saves a manual draft without using its tampered target display value", async () => {
    const { client, rpc } = clientWith("saved");
    await expect(saveInitialGuestDraft(client, userId, manualDraft())).resolves.toEqual({ ok: true, status: "saved" });
    expect(rpc).toHaveBeenCalledWith("save_initial_guest_draft", expect.objectContaining({
      p_target: expect.objectContaining({ source: "manual", target_kcal: 2000, goal: null, formula_branch: null }),
    }));
  });

  it("rejects invalid edited macros before calling the database", async () => {
    const { client, rpc } = clientWith("saved");
    const draft = calculatedDraft();
    draft.target.macros.protein_g = -1;
    await expect(saveInitialGuestDraft(client, userId, draft)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("negative") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects edited protein above the configured cap before calling the database", async () => {
    const { client, rpc } = clientWith("saved");
    const draft = calculatedDraft();
    draft.target.macros.protein_g = 250;
    await expect(saveInitialGuestDraft(client, userId, draft)).resolves.toMatchObject({ ok: false, error: expect.stringContaining("Protein cannot exceed") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ["under 18", () => { const draft = calculatedDraft(); draft.setup_inputs.calculate.age = "17"; return draft; }],
    ["out-of-range height", () => { const draft = calculatedDraft(); draft.setup_inputs.calculate.height = "231"; return draft; }],
    ["manual target below the floor", () => { const draft = manualDraft(); draft.setup_inputs.manual.target_kcal = "1199"; return draft; }],
  ])("rejects a tampered draft with %s", async (_label, makeDraft) => {
    const { client, rpc } = clientWith("saved");
    await expect(saveInitialGuestDraft(client, userId, makeDraft())).resolves.toMatchObject({ ok: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a missing signed-in user before calling the database", async () => {
    const { client, rpc } = clientWith("saved");
    await expect(saveInitialGuestDraft(client, undefined, calculatedDraft())).resolves.toMatchObject({ ok: false, error: expect.stringContaining("signed in") });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(["saved", "already_saved", "saved_target_exists"] as const)("returns the %s function status", async (status) => {
    const { client } = clientWith(status);
    await expect(saveInitialGuestDraft(client, userId, calculatedDraft())).resolves.toEqual({ ok: true, status });
  });
});
