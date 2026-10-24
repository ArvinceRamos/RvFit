"use client";

import Link from "next/link";
import { CopyMealButton } from "@/components/copy-meal-button";
import { CopyYesterdayButton } from "@/components/copy-yesterday-button";
import { DeleteMealButton } from "@/components/delete-meal-button";
import { MealEatenToggle } from "@/components/meal-eaten-toggle";
import { TodaySummary } from "@/components/today-summary";
import { dayPrepList, describeMealDay, mealDaysWindow, type MealDay, type MealDayMeal, type MealDayView } from "@/lib/meal-days";
import type { DayTotalsResult, MealDaysResult } from "@/lib/meal-days-data";
import { formatGrams, formatKcal } from "@/lib/remaining-format";
import type { DailyTargets } from "@/lib/suggestions";

const tabs: { view: MealDayView; label: string }[] = [
  { view: "today", label: "Today" },
  { view: "upcoming", label: "Upcoming" },
  { view: "past", label: "Past" },
];

const emptyText: Record<MealDayView, string> = {
  today: "No meals saved today yet.",
  upcoming: `No meals planned for the next ${mealDaysWindow} days.`,
  past: `No meals saved in the last ${mealDaysWindow} days.`,
};

// Meal dates are plain calendar dates, so format the parts directly to avoid time zone shifts.
function formatDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

function MealRow({ meal, date, today }: { meal: MealDayMeal; date: string; today: string }) {
  const status = meal.eaten ? null : date < today ? "Not eaten" : "Planned";
  return (
    <li className="flex gap-3 border-t border-line pt-3">
      <div className="w-5 shrink-0 pt-0.5">
        <MealEatenToggle eaten={meal.eaten} future={date > today} label={meal.label} mealId={meal.id} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <p>
            <span className="font-bold">{meal.label}</span>
            <span className="text-muted"> · {formatKcal(meal.totals.kcal)} · {formatGrams(meal.totals.protein_g)} protein</span>
            {status && <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-xs text-muted">{status}</span>}
          </p>
          <div className="flex flex-wrap items-start gap-4">
            {date < today && <CopyMealButton mealId={meal.id} />}
            <Link className="text-sm font-semibold underline" href={`/meals/${meal.id}`}>Edit</Link>
            <DeleteMealButton mealId={meal.id} />
          </div>
        </div>
        <p className="mt-1 text-sm">{meal.items.map((item) => `${item.name} ${item.grams} g`).join(" · ")}</p>
        <p className="mt-1 text-xs text-muted">
          Carbs {formatGrams(meal.totals.carbs_g)} · Fat {formatGrams(meal.totals.fat_g)} · Fiber{" "}
          {meal.totals.fiber_g === null ? "Incomplete" : formatGrams(meal.totals.fiber_g)}
        </p>
      </div>
    </li>
  );
}

function DayCard({ day, today }: { day: MealDay; today: string }) {
  const isToday = day.date === today;
  return (
    <li>
      {/* A closed card shows one summary line; opening it lists the meals. Today starts open. */}
      <details className="card group" open={isToday || undefined}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <span className="text-lg font-medium">{formatDay(day.date)}</span>
            {isToday && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent">Today</span>}
          </span>
          <span className="flex items-center gap-2 text-sm text-muted">
            {describeMealDay(day, today)}
            <span aria-hidden className="transition-transform group-open:rotate-90">▸</span>
          </span>
        </summary>
        {day.meals.length > 1 && (
          <section className="mt-3 rounded-xl border border-line p-3">
            <h3 className="text-sm font-semibold">Prep for the day</h3>
            <p className="text-xs text-muted">All meals together, as picked (cooked foods in cooked weight).</p>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2 sm:gap-x-6">
              {dayPrepList(day).map((food) => (
                <li className="flex justify-between gap-3" key={food.name}>
                  <span className="min-w-0">{food.name}</span>
                  <span className="shrink-0 font-semibold">{food.grams.toLocaleString("en-US")} g</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <ul className="mt-3 grid gap-3">
          {day.meals.map((meal) => <MealRow date={day.date} key={meal.id} meal={meal} today={today} />)}
        </ul>
      </details>
    </li>
  );
}

// The Meals page body: today's totals, the tabs, and one card per day, rendered on the server for the user's
// today (see requestClock). Ticks, copies and deletes re-render the page from their server actions.
export function MealDaysView({ target, view, today, result, todayTotals }: {
  target: DailyTargets | null;
  view: MealDayView;
  today: string;
  result: MealDaysResult;
  todayTotals: DayTotalsResult;
}) {
  // Yesterday's meals do not change after a copy, so the button (and its message) stays while the days reload.
  const showCopy = view === "today" && result.ok && result.yesterdayMeals > 0;

  return (
    <>
      <TodaySummary target={target} totals={todayTotals} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="btn-primary" href="/meals/new">New meal</Link>
        <Link className="btn-secondary text-base" href="/meals/plan">Plan meals</Link>
      </div>

      {showCopy && <CopyYesterdayButton today={today} />}

      <nav aria-label="Meal days" className="mt-8 flex gap-2">
        {tabs.map((tab) => (
          <Link
            aria-current={tab.view === view ? "page" : undefined}
            className="btn-ghost"
            href={tab.view === "today" ? "/meals" : `/meals?view=${tab.view}`}
            key={tab.view}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {!result.ok ? (
        <p className="alert-danger mt-6" role="alert">Your meals could not be loaded. Please try again.</p>
      ) : result.days.length === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {emptyText[view]}{" "}
          {view !== "past" && <Link className="font-semibold text-ink underline" href="/meals/plan">Plan meals</Link>}
        </p>
      ) : (
        <ul className="mt-6 grid gap-4">
          {result.days.map((day) => <DayCard day={day} key={day.date} today={today} />)}
        </ul>
      )}
    </>
  );
}
