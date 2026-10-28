"use client";

import { useState } from "react";
import { deleteActivityAction } from "@/app/dashboard/actions";

// Same Yes / No confirm as the meal and workout Delete buttons. The action re-renders Today.
export function DeleteActivityButton({ activityId, label }: { activityId: string; label: string }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    // No connection throws instead of returning an error.
    const result = await deleteActivityAction(activityId).catch(() => ({ ok: false as const, error: "The activity could not be deleted. Please try again." }));
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
    }
  }

  if (!asking) {
    return <button aria-label={`Delete ${label}`} className="text-sm font-semibold text-danger underline" onClick={() => setAsking(true)} type="button">Delete</button>;
  }
  return (
    <div className="grid justify-items-end gap-1" role="group" aria-label="Confirm delete">
      <p className="text-sm font-semibold">Delete this activity?</p>
      <div className="flex gap-3">
        <button className="text-sm font-semibold text-danger underline disabled:opacity-60" disabled={busy} onClick={confirmDelete} type="button">{busy ? "Deleting…" : "Yes"}</button>
        <button className="text-sm font-semibold underline disabled:opacity-60" disabled={busy} onClick={() => { setAsking(false); setError(undefined); }} type="button">No</button>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
