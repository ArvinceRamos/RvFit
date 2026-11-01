import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_DRAFT_STORAGE_KEY } from "@/lib/guest-draft";
import { clearDraft, getDraft, saveDraft, storedDraft } from "./guest-draft-store";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const target = {
  source: "manual" as const,
  target_kcal: 2000,
  goal: null,
  pace: null,
  formula_branch: null,
  floor_applied: false,
  floor_explanation: null,
  config_version: "v",
  macros: { protein_g: 100, carbs_g: 250, fat_g: 60, fiber_g: 28 },
};

describe("guest draft on the phone", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  it("offers nothing to save until the draft has a target", () => {
    saveDraft((draft) => ({ ...draft, adult_confirmed_at: "2026-11-01T00:00:00.000Z" }));
    expect(storedDraft()).toBeNull();
  });

  it("keeps one draft ID and the finished target until it is cleared after a save", () => {
    saveDraft((draft) => ({ ...draft, target }));
    expect(storedDraft()).toMatchObject({ target: { target_kcal: 2000 } });
    expect(getDraft().guest_draft_id).toBe(getDraft().guest_draft_id);
    clearDraft();
    expect(globalThis.localStorage.getItem(GUEST_DRAFT_STORAGE_KEY)).toBeNull();
    expect(storedDraft()).toBeNull();
  });
});
