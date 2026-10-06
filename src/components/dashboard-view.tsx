"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDashboardAction, type DashboardResult } from "@/app/dashboard/actions";
import { DayTotals, localToday } from "@/components/today-summary";
import { calculationConfig } from "@/lib/calc/config";
import { formatWeightKg } from "@/lib/weigh-in";

const cardClass = "mt-6 rounded-xl border border-zinc-200 bg-white p-5";
const linkButtonClass = "rounded-lg bg-lime-400 px-4 py-3 text-sm font-bold";

// Today at a glance. "Today" is the browser's local date. refreshKey changes when the saved
// target changes, so the dashboard loads again after a saved guest draft.
export function DashboardView({ refreshKey }: { refreshKey: string }) {
  const [state, setState] = useState<{ key: string; result: DashboardResult }>();

  useEffect(() => {
    let cancelled = false;
    loadDashboardAction(localToday())
      .then((result) => { if (!cancelled) setState({ key: refreshKey, result }); })
      .catch(() => { if (!cancelled) setState({ key: refreshKey, result: { ok: false, error: "Your dashboard could not be loaded. Please try again." } }); });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const quickActions = (
    <section className={cardClass}>
      <h2 className="text-xl font-bold">Quick actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className={linkButtonClass} href="/meals/new">New meal</Link>
        <Link className={linkButtonClass} href="/workouts">Log a workout</Link>
        <Link className={linkButtonClass} href="/progress">Log a weigh-in</Link>
      </div>
    </section>
  );

  if (!state) return <p className="mt-6 text-sm text-zinc-700">Loading today…</p>;
  if (!state.result.ok) return <><p className="mt-6 text-sm text-red-800">{state.result.error}</p>{quickActions}</>;

  const { target, totals, meals, workouts, trend, units } = state.result;
  return (
    <>
      <section className={cardClass}>
        <h2 className="text-xl font-bold">Today</h2>
        <DayTotals target={target} totals={totals} />
      </section>

      <section className={cardClass}>
        <h2 className="text-xl font-bold">Meals</h2>
        {meals.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-700">No meals saved today. <Link className="font-semibold underline" href="/meals/new">Add a meal</Link></p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {meals.map((meal) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={meal.id}>
                <span><span className="font-bold">{meal.label}</span> · {Math.round(meal.totals.kcal)} kcal</span>
                <Link className="font-semibold underline" href={`/meals/${meal.id}`}>Edit</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-xl font-bold">Workout</h2>
        {workouts.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-700">No workout logged today. <Link className="font-semibold underline" href="/workouts">Go to Workouts</Link></p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {workouts.map((workout) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={workout.id}>
                <span><span className="font-bold">{workout.day_name}</span> · {workout.set_count} {workout.set_count === 1 ? "set" : "sets"}</span>
                <Link className="font-semibold underline" href={`/workouts/log/${workout.id}`}>Edit</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-xl font-bold">Weight trend</h2>
        {trend.status === "ok" ? (
          <>
            <p className="mt-3 text-2xl font-bold">{formatWeightKg(trend.average_kg, units)}</p>
            <p className="mt-1 text-sm text-zinc-600">Average of {trend.count} weigh-ins in the last {calculationConfig.progress.trend_window_days} days.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-700">Not enough data yet.</p>
        )}
      </section>

      {quickActions}
    </>
  );
}
