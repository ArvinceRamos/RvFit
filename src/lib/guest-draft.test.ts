import { beforeEach, describe, expect, it } from "vitest";
import {
  GUEST_DRAFT_STORAGE_KEY,
  createGuestDraft,
  readGuestDraft,
  storedDraftHasTarget,
  updateGuestDraft,
  writeGuestDraft,
} from "./guest-draft";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

describe("guest drafts", () => {
  it("creates a draft with a stable key after it is saved", () => {
    const draft = createGuestDraft();
    writeGuestDraft(storage, draft);

    expect(readGuestDraft(storage)).toEqual(draft);
    expect(readGuestDraft(storage).guest_draft_id).toBe(draft.guest_draft_id);
  });

  it("writes updates to localStorage without clearing prior draft data", () => {
    const first = readGuestDraft(storage);
    writeGuestDraft(storage, first);
    const updated = updateGuestDraft(storage, (draft) => ({
      ...draft,
      adult_confirmed_at: "2026-10-04T00:00:00.000Z",
      initial_body_log: { weight_kg: 80 },
    }));

    expect(updated.guest_draft_id).toBe(first.guest_draft_id);
    expect(JSON.parse(storage.getItem(GUEST_DRAFT_STORAGE_KEY) ?? "{}"))
      .toMatchObject({
        guest_draft_id: first.guest_draft_id,
        adult_confirmed_at: "2026-10-04T00:00:00.000Z",
        initial_body_log: { weight_kg: 80 },
      });
  });

  it("replaces malformed stored data with a usable draft", () => {
    storage.setItem(GUEST_DRAFT_STORAGE_KEY, "not json");

    expect(readGuestDraft(storage).guest_draft_id).toEqual(expect.any(String));
  });
});

describe("storedDraftHasTarget", () => {
  it("is true only for a draft with a finished target", () => {
    expect(storedDraftHasTarget(null)).toBe(false);
    expect(storedDraftHasTarget("not json")).toBe(false);
    expect(storedDraftHasTarget(JSON.stringify({ guest_draft_id: "x", adult_confirmed_at: "2026-10-04T00:00:00.000Z" }))).toBe(false);
    expect(storedDraftHasTarget(JSON.stringify({ guest_draft_id: "x", target: { source: "manual", target_kcal: 2000 } }))).toBe(true);
  });
});
