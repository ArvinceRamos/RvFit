"use client";

import { useState } from "react";
import { deleteWorkoutLogAction } from "@/app/workouts/actions";

export function DeleteWorkoutButton({ logId }: { logId: string }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await deleteWorkoutLogAction(logId);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
  }

  if (!asking) {
    return <button className="text-sm font-semibold text-danger underline" onClick={() => setAsking(true)} type="button">Delete</button>;
  }
  return (
    <div className="grid justify-items-end gap-1" role="group" aria-label="Confirm delete">
      <p className="text-sm font-semibold">Delete this workout?</p>
      <div className="flex gap-3">
        <button className="text-sm font-semibold text-danger underline disabled:opacity-60" disabled={busy} onClick={confirmDelete} type="button">{busy ? "Deleting…" : "Yes"}</button>
        <button className="text-sm font-semibold underline disabled:opacity-60" disabled={busy} onClick={() => { setAsking(false); setError(undefined); }} type="button">No</button>
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    </div>
  );
}
