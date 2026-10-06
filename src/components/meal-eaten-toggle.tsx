"use client";

import { useState } from "react";
import { setMealEatenAction } from "@/app/meals/actions";

// "I ate this" for a planner meal. Future days cannot be ticked. onChanged reloads the totals.
export function MealEatenToggle({ mealId, label, eaten, future, onChanged }: {
  mealId: string;
  label: string;
  eaten: boolean;
  future: boolean;
  onChanged: () => void;
}) {
  const [checked, setChecked] = useState(eaten);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function toggle(next: boolean) {
    setBusy(true);
    setError(undefined);
    setChecked(next);
    const result = await setMealEatenAction(mealId, next).catch(() => ({ ok: false, error: "The meal could not be updated. Please try again." }) as const);
    setBusy(false);
    if (!result.ok) {
      setChecked(!next);
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <span className="inline-grid gap-1">
      <input
        aria-label={`Ate ${label}`}
        checked={checked}
        className="size-5 cursor-pointer accent-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={busy || future}
        onChange={(event) => toggle(event.target.checked)}
        title={future ? "You can tick this on the day." : undefined}
        type="checkbox"
      />
      {error && <span aria-live="polite" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
