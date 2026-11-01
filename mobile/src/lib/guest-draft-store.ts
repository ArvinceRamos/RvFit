import { useSyncExternalStore } from "react";
import { GUEST_DRAFT_STORAGE_KEY, readGuestDraft, storedDraftHasTarget, updateGuestDraft, type GuestDraft } from "@/lib/guest-draft";

// The guest draft (docs/PLAN.md, "Guest and signed-in flow") kept on the phone, using the web app's
// own draft logic. The web keeps it in the browser's localStorage; here the same localStorage API is
// backed by SQLite (expo-sqlite/localStorage, installed in app/_layout.tsx), so it survives restarts.
// It holds setup answers only, never tokens.

const listeners = new Set<() => void>();

function storage(): Storage {
  return globalThis.localStorage as Storage;
}

function emit() {
  for (const listener of listeners) listener();
}

export function getDraft(): GuestDraft {
  return readGuestDraft(storage());
}

export function saveDraft(update: (draft: GuestDraft) => GuestDraft): GuestDraft {
  const draft = updateGuestDraft(storage(), update);
  emit();
  return draft;
}

export function clearDraft(): void {
  storage().removeItem(GUEST_DRAFT_STORAGE_KEY);
  emit();
}

/** The raw stored draft, for the save after sign-in. */
export function storedDraft(): unknown {
  const raw = storage().getItem(GUEST_DRAFT_STORAGE_KEY);
  return storedDraftHasTarget(raw) ? JSON.parse(raw!) : null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useGuestDraft(): GuestDraft {
  return useSyncExternalStore(subscribe, getDraft, getDraft);
}
