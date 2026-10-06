"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadDashboardAction, type DashboardResult } from "@/app/dashboard/actions";
import { MealEatenToggle } from "@/components/meal-eaten-toggle";
import { DayTotals, localToday } from "@/components/today-summary";
import { calculationConfig } from "@/lib/calc/config";
import { formatWeightKg } from "@/lib/weigh-in";

// Today at a glance. "Today" is the browser's local date. refreshKey changes when the saved
// target changes, so the dashboard loads again after a saved guest draft.
export function DashboardView({ refreshKey }: { refreshKey: string }) {
  const [state, setState] = useState<{ key: string; result: DashboardResult }>();
  // Bumped after a meal is ticked, so the totals load again.
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadDashboardAction(localToday())
      .then((result) => { if (!cancelled) setState({ key: refreshKey, result }); })
      .catch(() => { if (!cancelled) setState({ key: refreshKey, result: { ok: false, error: "Your dashboard could not be loaded. Please try again." } }); });
    return () => { cancelled = true; };
  }, [refreshKey, reloads]);

  const quickActions = (
    <section className="card">
      <h2 className="text-xl font-medium">Quick actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="btn-primary" href="/meals/new">New meal</Link>
        <Link className="btn-secondary" href="/workouts">Log a workout</Link>
        <Link className="btn-secondary" href="/progress">Log a weigh-in</Link>
      </div>
    </section>
  );

  if (!state) return <p className="mt-6 text-sm text-muted">Loading today…</p>;
  if (!state.result.ok) {
    return (
      <>
        <p className="mt-6 text-sm text-danger">{state.result.error}</p>
        <div className="mt-6">{quickActions}</div>
      </>
    );
  }

  const { target, totals, planned_kcal, meals, workouts, trend, units } = state.result;
  return (
    <div className="mt-8 grid gap-[30px] md:grid-cols-2 lg:grid-cols-3">
      <section className="card md:col-span-2 lg:col-span-3">
        <h2 className="text-xl font-medium">Today</h2>
        <DayTotals plannedKcal={planned_kcal} target={target} totals={totals} />
      </section>

      <section className="card">
        <h2 className="text-xl font-medium">Meals</h2>
        {meals.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No meals saved today. <Link className="font-semibold text-ink underline" href="/meals/new">Add a meal</Link></p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {meals.map((meal) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={meal.id}>
                <span className="flex items-center gap-2">
                  {meal.from_plan && (
                    <MealEatenToggle eaten={meal.eaten} future={false} label={meal.label} mealId={meal.id} onChanged={() => setReloads((count) => count + 1)} />
                  )}
                  <span><span className="font-bold">{meal.label}</span> <span className="text-muted">· {Math.round(meal.totals.kcal)} kcal{meal.from_plan && !meal.eaten ? " · planned" : ""}</span></span>
                </span>
                <Link className="font-semibold underline" href={`/meals/${meal.id}`}>Edit</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="text-xl font-medium">Workout</h2>
        {workouts.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No workout logged today. <Link className="font-semibold text-ink underline" href="/workouts">Go to Workouts</Link></p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {workouts.map((workout) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={workout.id}>
                <span><span className="font-bold">{workout.day_name}</span> <span className="text-muted">· {workout.set_count} {workout.set_count === 1 ? "set" : "sets"}</span></span>
                <Link className="font-semibold underline" href={`/workouts/log/${workout.id}`}>Edit</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="text-xl font-medium">Weight trend</h2>
        {trend.status === "ok" ? (
          <>
            <p className="mt-3 text-3xl font-medium tracking-tight">{formatWeightKg(trend.average_kg, units)}</p>
            <p className="mt-1 text-sm text-muted">Average of {trend.count} weigh-ins in the last {calculationConfig.progress.trend_window_days} days.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">Not enough data yet.</p>
        )}
      </section>

      <div className="md:col-span-2 lg:col-span-3">{quickActions}</div>
    </div>
  );
}
