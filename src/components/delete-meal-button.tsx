"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteMealAction } from "@/app/meals/actions";

// onDeleted lets a client list reload itself; the page is refreshed either way.
export function DeleteMealButton({ mealId, onDeleted }: { mealId: string; onDeleted?: () => void }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await deleteMealAction(mealId);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    router.refresh();
    onDeleted?.();
  }

  if (!asking) {
    return <button className="text-sm font-semibold text-danger underline" onClick={() => setAsking(true)} type="button">Delete</button>;
  }
  return (
    <div className="grid justify-items-end gap-1" role="group" aria-label="Confirm delete">
      <p className="text-sm font-semibold">Delete this meal?</p>
      <div className="flex gap-3">
        <button className="text-sm font-semibold text-danger underline disabled:opacity-60" disabled={busy} onClick={confirmDelete} type="button">{busy ? "Deleting…" : "Yes"}</button>
        <button className="text-sm font-semibold underline disabled:opacity-60" disabled={busy} onClick={() => { setAsking(false); setError(undefined); }} type="button">No</button>
      </div>
      {error && <p aria-live="polite" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
