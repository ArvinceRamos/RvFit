import type { DefaultMacros, GoalInput, PaceInput } from "@/lib/calc/calculate";
import type { ActivityLevel, FormulaBranch } from "@/lib/calc/config";

export const GUEST_DRAFT_STORAGE_KEY = "rvfit-guest-draft";
export const GUEST_DRAFT_EVENT = "rvfit-guest-draft-updated";

const draftCache = new WeakMap<Storage, { raw: string | null; draft: GuestDraft }>();

export type GuestDraft = {
  guest_draft_id: string;
  adult_confirmed_at?: string;
  profile?: {
    age_years?: number;
    height_cm?: number;
    weight_kg?: number;
    sex_formula_branch?: FormulaBranch;
    activity_level?: ActivityLevel;
    preferred_units?: "metric" | "imperial";
  };
  setup_inputs?: {
    calculate?: {
      age: string;
      height: string;
      feet: string;
      inches: string;
      weight: string;
      sex: FormulaBranch | "";
      activity: ActivityLevel;
      goal: GoalInput;
      pace: PaceInput;
      units: "metric" | "imperial";
    };
    manual?: {
      target_kcal: string;
      weight: string;
      units: "metric" | "imperial";
    };
  };
  target?: {
    source: "calculated" | "manual";
    target_kcal: number;
    goal: GoalInput | null;
    pace: PaceInput | null;
    formula_branch: FormulaBranch | null;
    floor_applied: boolean;
    floor_explanation: string | null;
    config_version: string;
    macros: DefaultMacros;
  };
  initial_body_log?: { weight_kg: number };
};

function createDraftId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random()}`;
}

export function createGuestDraft(): GuestDraft {
  return { guest_draft_id: createDraftId() };
}

export function readGuestDraft(storage: Storage): GuestDraft {
  const saved = storage.getItem(GUEST_DRAFT_STORAGE_KEY);
  const cached = draftCache.get(storage);
  if (cached?.raw === saved) return cached.draft;
  if (!saved) {
    const draft = createGuestDraft();
    draftCache.set(storage, { raw: saved, draft });
    return draft;
  }

  try {
    const parsed: unknown = JSON.parse(saved);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "guest_draft_id" in parsed &&
      typeof parsed.guest_draft_id === "string"
    ) {
      const draft = parsed as GuestDraft;
      draftCache.set(storage, { raw: saved, draft });
      return draft;
    }
  } catch {
    // Replace invalid local data with a new draft below.
  }

  const draft = createGuestDraft();
  draftCache.set(storage, { raw: saved, draft });
  return draft;
}

export function writeGuestDraft(storage: Storage, draft: GuestDraft): void {
  const raw = JSON.stringify(draft);
  storage.setItem(GUEST_DRAFT_STORAGE_KEY, raw);
  draftCache.set(storage, { raw, draft });
}

export function updateGuestDraft(
  storage: Storage,
  update: (draft: GuestDraft) => GuestDraft,
): GuestDraft {
  const draft = update(readGuestDraft(storage));
  writeGuestDraft(storage, draft);
  return draft;
}

/**
 * True when the stored draft holds a finished target that can be saved to an account.
 * A draft with only the age tick or half-filled inputs is not worth saving or warning about.
 */
export function storedDraftHasTarget(rawDraft: string | null): boolean {
  if (!rawDraft) return false;
  try {
    const draft = JSON.parse(rawDraft) as Partial<GuestDraft> | null;
    return Boolean(draft && typeof draft === "object" && draft.target && typeof draft.target.target_kcal === "number");
  } catch {
    return false;
  }
}
