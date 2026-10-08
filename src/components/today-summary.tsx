"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDayTotalsAction, type DayTotalsResult } from "@/app/meals/actions";
import type { MealTotals } from "@/lib/meal";
import { describeRemaining, progressPercent } from "@/lib/remaining-format";
import { remainingTargets, type DailyTargets } from "@/lib/suggestions";

export function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const number = (value: number) => Math.round(value).toLocaleString("en-US");

// A thin bar. It is decoration only: the numbers beside it say the same thing.
export function Bar({ percent, over }: { percent: number; over: boolean }) {
  return (
    <div aria-hidden className="mt-2 h-2 overflow-hidden rounded-full bg-track">
      <div className={`h-full rounded-full ${over ? "bg-warn" : "bg-accent"}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

// Eaten, target, and left for one day. With no saved target it links to set one.
// plannedKcal: meals saved for the day but not ticked as eaten yet. They are not in the totals.
export function DayTotals({ target, totals, plannedKcal = 0 }: { target: DailyTargets | null; totals: MealTotals; plannedKcal?: number }) {
  if (!target) {
    return (
      <p className="mt-3 text-sm text-muted">
        Totals need a saved calorie target. <Link className="font-semibold underline" href="/start">Set up a target</Link>, then save it to your account.
      </p>
    );
  }
  const left = remainingTargets(target, totals);
  const tiles = [
    { name: "Protein", eaten: totals.protein_g as number | null, goal: target.protein_g, left: left.protein_g as number | null },
    { name: "Carbs", eaten: totals.carbs_g as number | null, goal: target.carbs_g, left: left.carbs_g as number | null },
    { name: "Fat", eaten: totals.fat_g as number | null, goal: target.fat_g, left: left.fat_g as number | null },
    // Fiber is null when any food that day has no fiber value, so a partial total is never shown.
    { name: "Fiber", eaten: totals.fiber_incomplete ? null : totals.fiber_g, goal: target.fiber_g, left: left.fiber_g },
  ];
  const caloriesOver = left.kcal < 0;

  return (
    <>
      <div className="mt-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p>
            <span className="text-3xl font-bold tracking-tight">{number(totals.kcal)}</span>
            <span className="ml-2 text-base text-muted">of {number(target.kcal)} kcal</span>
          </p>
          <p className={`text-base font-semibold ${caloriesOver ? "text-warn" : "text-ink"}`}>
            {describeRemaining(left.kcal, "kcal")}
          </p>
        </div>
        <Bar over={caloriesOver} percent={progressPercent(totals.kcal, target.kcal)} />
        {plannedKcal > 0 && <p className="mt-2 text-sm text-muted">+{number(plannedKcal)} kcal planned, not ticked as eaten yet.</p>}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => {
          const over = tile.left !== null && tile.left < 0;
          return (
            <div className="rounded-lg border border-line bg-page p-3" key={tile.name}>
              <dt className="text-sm text-muted">{tile.name}</dt>
              <dd className={`mt-1 font-bold ${tile.eaten === null ? "text-base" : "text-lg"}`}>{tile.eaten === null ? "Incomplete" : `${tile.eaten.toFixed(1)} g`}</dd>
              <dd className="text-sm text-muted">of {tile.goal} g</dd>
              {tile.eaten !== null && (
                <>
                  <dd><Bar over={over} percent={progressPercent(tile.eaten, tile.goal)} /></dd>
                  <dd className={`mt-2 text-sm font-semibold ${over ? "text-warn" : "text-ink"}`}>
                    {describeRemaining(tile.left ?? 0, "g")}
                  </dd>
                </>
              )}
            </div>
          );
        })}
      </dl>
      {totals.fiber_incomplete && <p className="mt-3 text-sm text-muted">Some foods have no fiber listed, so fiber is not totalled.</p>}
    </>
  );
}

const emptyTotals: MealTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, fiber_incomplete: false };

// Today's eaten, target, and left. "Today" is the browser's local date.
// refreshKey changes when the meal list changes, so the card loads again.
export function TodaySummary({ target, refreshKey }: { target: DailyTargets | null; refreshKey: string }) {
  const [state, setState] = useState<{ key: string; result: DayTotalsResult }>();

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    loadDayTotalsAction(localToday(), null)
      .then((result) => { if (!cancelled) setState({ key: refreshKey, result }); })
      .catch(() => { if (!cancelled) setState({ key: refreshKey, result: { ok: false } }); });
    return () => { cancelled = true; };
  }, [target, refreshKey]);

  return (
    <section className="card mt-6">
      <h2 className="text-xl font-medium">Today</h2>
      {!target && <DayTotals target={null} totals={emptyTotals} />}
      {target && !state && <p className="mt-3 text-sm text-muted">Loading today&apos;s totals…</p>}
      {target && state && !state.result.ok && <p className="mt-3 text-sm text-danger">Today&apos;s totals are not available right now. Please try again.</p>}
      {target && state?.result.ok && <DayTotals plannedKcal={state.result.planned.kcal} target={target} totals={state.result.totals} />}
    </section>
  );
}
