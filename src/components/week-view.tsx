"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadWeekAction, type WeekResult } from "@/app/week/actions";
import { Bar, localToday } from "@/components/today-summary";
import { progressPercent } from "@/lib/remaining-format";

const cardClass = "rounded-xl border border-zinc-200 bg-white p-5";

// Calendar dates are plain "YYYY-MM-DD" text, so build the Date from its parts to avoid time zone shifts.
function dayParts(date: string): { weekday: string; short: string } {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(year, month - 1, day);
  return {
    weekday: new Intl.DateTimeFormat("en", { weekday: "long" }).format(value),
    short: new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(value),
  };
}

const kcal = (value: number) => Math.round(value).toLocaleString("en-US");

// The current week, Monday to Sunday, from saved meals, workouts, and Preferences. Read-only.
// "This week" comes from the browser's local date.
export function WeekView() {
  const [result, setResult] = useState<WeekResult>();

  useEffect(() => {
    let cancelled = false;
    loadWeekAction(localToday())
      .then((week) => { if (!cancelled) setResult(week); })
      .catch(() => { if (!cancelled) setResult({ ok: false, error: "Your week could not be loaded. Please try again." }); });
    return () => { cancelled = true; };
  }, []);

  if (!result) return <p className="mt-6 text-sm text-zinc-700">Loading this week…</p>;
  if (!result.ok) return <p className="mt-6 text-sm text-red-800">{result.error}</p>;

  const { today, target, days, plan } = result;
  return (
    <>
      <ul className="mt-6 grid gap-3">
        {days.map((day) => {
          const { weekday, short } = dayParts(day.date);
          const isToday = day.date === today;
          const over = target !== null && day.totals.kcal > target.kcal;
          return (
            <li
              aria-current={isToday ? "date" : undefined}
              className={`${cardClass} ${isToday ? "border-lime-500 ring-1 ring-lime-500" : ""}`}
              key={day.date}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-lg font-bold">
                  {weekday} <span className="text-sm font-normal text-zinc-600">{short}</span>
                </h2>
                {isToday && <span className="rounded-full bg-lime-400 px-2 py-0.5 text-xs font-bold text-zinc-950">Today</span>}
              </div>

              <div className="mt-3 text-sm">
                {day.meal_count === 0 ? (
                  <p className="text-zinc-600">No meals saved</p>
                ) : (
                  <>
                    <p>
                      <span className="text-base font-bold">{kcal(day.totals.kcal)} kcal</span>
                      {target && <span className="text-zinc-600"> of {kcal(target.kcal)} kcal</span>}
                      <span className="text-zinc-600"> · {day.meal_count} {day.meal_count === 1 ? "meal" : "meals"}</span>
                    </p>
                    {target && <Bar over={over} percent={progressPercent(day.totals.kcal, target.kcal)} />}
                  </>
                )}
              </div>

              <div className="mt-3 text-sm">
                {day.workouts.length === 0 ? (
                  <p className="text-zinc-600">No workout logged</p>
                ) : (
                  <ul className="grid gap-1">
                    {day.workouts.map((workout) => (
                      <li key={workout.id}>
                        <Link className="underline" href={`/workouts/log/${workout.id}`}>
                          <span className="font-semibold">{workout.day_name}</span>
                        </Link>
                        <span className="text-zinc-600"> · {workout.set_count} {workout.set_count === 1 ? "set" : "sets"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {!target && (
        <p className="mt-4 text-sm text-zinc-700">
          Add a saved calorie target to compare each day. <Link className="font-semibold underline" href="/start">Set up a target</Link>
        </p>
      )}

      <section className={`${cardClass} mt-8`}>
        <h2 className="text-xl font-bold">This week&apos;s plan</h2>
        {plan === null ? (
          <p className="mt-3 text-sm text-zinc-700">
            Save your experience, equipment, and training days in Preferences to see your workout days here.{" "}
            <Link className="font-semibold underline" href="/preferences">Go to Preferences</Link>
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {plan.days.map((day) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={day.key}>
                <span className="font-semibold">{day.name}</span>
                <span className={day.count > 0 ? "font-semibold text-lime-800" : "text-zinc-600"}>
                  {day.count > 0 ? `Logged ${day.count} ${day.count === 1 ? "time" : "times"}` : "Not logged yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
