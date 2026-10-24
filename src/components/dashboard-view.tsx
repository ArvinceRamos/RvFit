"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckInCard } from "@/components/check-in-card";
import { Icon } from "@/components/icon";
import { MealEatenToggle } from "@/components/meal-eaten-toggle";
import { SetupCard } from "@/components/setup-card";
import { WeeklyReviewCard } from "@/components/weekly-review-card";
import { DayTotals } from "@/components/today-summary";
import { calculationConfig } from "@/lib/calc/config";
import { checkInReady } from "@/lib/check-in";
import type { DashboardResult } from "@/lib/dashboard-data";
import { formatKcal } from "@/lib/remaining-format";
import { goalPaceLabel } from "@/lib/target-options";
import { formatWeightKg } from "@/lib/weigh-in";

// Today at a glance, rendered on the server with the user's today (see requestClock). Saves on this page
// (a meal tick, a check-in, a guest draft) re-render it from their server actions.
export function DashboardView({ result }: { result: DashboardResult }) {
  // After a check-in is accepted, its card stays to show the confirmation while today reloads.
  const [keepCheckIn, setKeepCheckIn] = useState(false);

  const quickActions = (
    <section className="card">
      <h2 className="section-title">Quick actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="btn-primary" href="/meals/new">New meal</Link>
        <Link className="btn-secondary" href="/workouts">Log a workout</Link>
        <Link className="btn-secondary" href="/progress">Log a weigh-in</Link>
        <Link className="btn-secondary" href="/week">This week</Link>
      </div>
    </section>
  );

  if (!result.ok) {
    return (
      <>
        <p className="alert-danger mt-6" role="alert">{result.error}</p>
        <div className="mt-6">{quickActions}</div>
      </>
    );
  }

  const { target, totals, planned_kcal, meals, workouts, trend, units, setup, nextUp, checkIn, review } = result;
  return (
    <div className="mt-8 grid gap-[30px] md:grid-cols-2 lg:grid-cols-3">
      <SetupCard flags={setup} />
      <section className="card md:col-span-2 lg:col-span-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="calories" />Eaten today</h2>
          {target && goalPaceLabel(target.goal, target.pace) && (
            <p className="text-sm text-muted">
              Goal: <span className="font-semibold text-ink">{goalPaceLabel(target.goal, target.pace)}</span>
            </p>
          )}
        </div>
        <DayTotals plannedKcal={planned_kcal} target={target} totals={totals} />
      </section>

      <WeeklyReviewCard checkIn={checkIn} className="md:col-span-2 lg:col-span-3" review={review} targetKcal={target?.kcal ?? null} units={units} />

      {/* Shown only when the check-in has a result; Profile shows it while it waits for weigh-ins. */}
      {checkIn && (keepCheckIn || checkInReady(checkIn)) && (
        <CheckInCard
          checkIn={checkIn}
          className="md:col-span-2 lg:col-span-3"
          onSaved={() => setKeepCheckIn(true)}
          units={units}
        />
      )}

      <section className="card">
        <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="meals" />Meals</h2>
        {meals.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No meals saved today. <Link className="font-semibold text-ink underline" href="/meals/new">Add a meal</Link></p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {meals.map((meal) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={meal.id}>
                <span className="flex items-center gap-2">
                  <MealEatenToggle eaten={meal.eaten} future={false} label={meal.label} mealId={meal.id} />
                  <span><span className="font-bold">{meal.label}</span> <span className="text-muted">· {formatKcal(meal.totals.kcal)}{meal.eaten ? "" : " · planned"}</span></span>
                </span>
                <Link className="font-semibold underline" href={`/meals/${meal.id}`}>Edit</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="workouts" />Workout</h2>
        {workouts.length === 0 ? (
          nextUp?.status === "next" ? (
            <div className="mt-3">
              <p className="text-sm text-muted">Next up · {nextUp.done} of {nextUp.planned} done this week</p>
              <Link className="btn-primary btn-sm mt-2" href={`/workouts/log/new?day=${nextUp.dayKey}`}>Log {nextUp.dayName}</Link>
            </div>
          ) : nextUp?.status === "done" ? (
            <p className="mt-3 text-sm text-muted">All {nextUp.planned} planned workouts are done this week. Rest well. <Link className="font-semibold text-ink underline" href="/workouts">See your plan</Link></p>
          ) : setup.hasPreferences ? (
            <p className="mt-3 text-sm text-muted">No workout logged today. <Link className="font-semibold text-ink underline" href="/workouts">Go to Train</Link></p>
          ) : (
            <p className="mt-3 text-sm text-muted">Save your training preferences to get a workout plan. <Link className="font-semibold text-ink underline" href="/preferences">Set preferences</Link></p>
          )
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
        <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="progress" />Weight trend</h2>
        {trend.status === "ok" ? (
          <>
            <p className="mt-3 metric">{formatWeightKg(trend.average_kg, units)}</p>
            <p className="mt-1 text-sm text-muted">Average of {trend.count} weigh-ins in the last {calculationConfig.progress.trend_window_days} days.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted">
            Needs {calculationConfig.progress.trend_min_weigh_ins} weigh-ins in {calculationConfig.progress.trend_window_days} days (you have {trend.count}).{" "}
            <Link className="font-semibold text-ink underline" href="/progress">Log a weigh-in</Link>
          </p>
        )}
      </section>

      <div className="md:col-span-2 lg:col-span-3">{quickActions}</div>
    </div>
  );
}
