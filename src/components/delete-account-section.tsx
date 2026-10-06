"use client";

import { useState } from "react";
import { deleteAccountAction } from "@/app/profile/delete-account-action";

// The confirmation step is a second button, not a checkbox. On success the action signs out and
// goes to the home page, so this component only handles errors.
export function DeleteAccountSection() {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(undefined);
    const result = await deleteAccountAction();
    // Only reached when the deletion did not happen.
    setDeleting(false);
    if (result && !result.ok) setError(result.error);
  }

  return (
    <section className="card mt-[30px] !border-danger-edge">
      <h2 className="text-xl font-medium">Delete my account and data</h2>
      {!confirming ? (
        <>
          <p className="mt-2 text-sm text-muted">Remove your account and everything you have saved in RvFit.</p>
          <button className="mt-4 rounded-[15px] border border-danger-edge px-4 py-3 text-sm font-semibold text-danger hover:bg-danger-bg" onClick={() => setConfirming(true)} type="button">
            Delete my account and data
          </button>
        </>
      ) : (
        <div className="mt-3 rounded-lg bg-danger-bg p-4" role="alertdialog" aria-labelledby="delete-account-title" aria-describedby="delete-account-detail">
          <p className="font-bold text-danger" id="delete-account-title">Delete everything?</p>
          <p className="mt-2 text-sm text-ink" id="delete-account-detail">
            This deletes your account and all your saved data: profile, calorie targets, weigh-ins, preferences, meals, and workouts. It cannot be undone.
          </p>
          {error && <p aria-live="polite" className="mt-3 text-sm font-semibold text-danger">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-[15px] bg-danger-fill px-4 py-3 text-sm font-bold text-on-danger hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" disabled={deleting} onClick={confirmDelete} type="button">
              {deleting ? "Deleting…" : "Delete everything"}
            </button>
            <button className="btn-secondary disabled:opacity-60" disabled={deleting} onClick={() => { setConfirming(false); setError(undefined); }} type="button">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
