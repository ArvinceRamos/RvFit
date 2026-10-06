"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetSwapAction, saveSwapAction } from "@/app/workouts/actions";

export type SwapChoice = { key: string; label: string };

export function SwapControl({ templateKey, slotKey, choices, isSwapped }: {
  templateKey: string;
  slotKey: string;
  choices: SwapChoice[];
  isSwapped: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setBusy(true);
    setError(undefined);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (choices.length === 0 && !isSwapped) return null;

  return (
    <div className="mt-2 grid gap-2 text-sm">
      <div className="flex flex-wrap items-start gap-4">
        {choices.length > 0 && (
          <details onToggle={(event) => setOpen(event.currentTarget.open)} open={open}>
            <summary className="cursor-pointer font-semibold underline">Swap</summary>
            <ul className="mt-2 grid gap-1">
              {choices.map((choice) => (
                <li key={choice.key}>
                  <button
                    className="text-left underline disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    onClick={() => run(() => saveSwapAction({ templateKey, slotKey, exerciseKey: choice.key }))}
                    type="button"
                  >
                    {choice.label}
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
        {isSwapped && (
          <button
            className="font-semibold underline disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => run(() => resetSwapAction({ templateKey, slotKey }))}
            type="button"
          >
            Reset to default
          </button>
        )}
      </div>
      {error && <p aria-live="polite" className="text-danger">{error}</p>}
    </div>
  );
}
