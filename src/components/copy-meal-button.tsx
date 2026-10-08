"use client";

import Link from "next/link";
import { useState } from "react";
import { copyMealToDateAction } from "@/app/meals/actions";
import { localToday } from "@/components/today-summary";

// "Log again today" on a past meal: a new logged meal with the same foods and grams, under the
// first free label for today. Nothing else changes.
export function CopyMealButton({ mealId }: { mealId: string }) {
  const [state, setState] = useState<{ status: "idle" | "saving" } | { status: "done"; label: string } | { status: "error"; error: string }>({ status: "idle" });

  async function copy() {
    if (state.status === "saving") return;
    setState({ status: "saving" });
    const result = await copyMealToDateAction(mealId, localToday()).catch(() => ({ ok: false as const, error: "That meal could not be copied. Please try again." }));
    setState(result.ok ? { status: "done", label: result.label } : { status: "error", error: result.error });
  }

  if (state.status === "done") {
    return (
      <span className="text-sm text-muted" role="status">
        Logged as {state.label} today. <Link className="font-semibold text-ink underline" href="/meals?view=today">View today</Link>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <button className="text-sm font-semibold underline disabled:opacity-60" disabled={state.status === "saving"} onClick={copy} type="button">
        {state.status === "saving" ? "Logging…" : "Log again today"}
      </button>
      {state.status === "error" && <span className="text-sm text-danger" role="alert">{state.error}</span>}
    </span>
  );
}
