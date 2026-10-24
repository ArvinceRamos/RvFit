"use client";

import { useState } from "react";
import { copyMealDayAction } from "@/app/meals/actions";
import { addDays } from "@/lib/week";

// "Copy yesterday" on the Meals Today tab: all of yesterday's meals, foods and grams, saved again
// for today in one go. The copies start unticked, like every new meal. The action re-renders the page.
// count: yesterday's meals not on today yet. At 0 the button is hidden, but a done message stays.
export function CopyYesterdayButton({ count, today }: { count: number; today: string }) {
  const [state, setState] = useState<{ status: "idle" | "saving" } | { status: "done"; count: number } | { status: "error"; error: string }>({ status: "idle" });

  async function copy() {
    if (state.status === "saving") return;
    setState({ status: "saving" });
    const result = await copyMealDayAction(addDays(today, -1), today).catch(() => ({ ok: false as const, error: "Those meals could not be copied. Please try again." }));
    if (!result.ok) {
      setState({ status: "error", error: result.error });
      return;
    }
    setState({ status: "done", count: result.count });
  }

  if (state.status === "done") {
    return (
      <p className="alert-success mt-4" role="status">
        Copied {state.count} {state.count === 1 ? "meal" : "meals"} from yesterday. Tick each one when you eat it.
      </p>
    );
  }
  if (count === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button className="btn-secondary btn-sm" disabled={state.status === "saving"} onClick={copy} type="button">
        {state.status === "saving" ? "Copying…" : "Copy yesterday"}
      </button>
      {state.status === "error" && <span className="text-sm text-danger" role="alert">{state.error}</span>}
    </div>
  );
}
