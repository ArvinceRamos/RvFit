"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { burnedToday, minutesSinceLocalMidnight } from "@/lib/activity/burn";
import type { TodayBurnBase } from "@/lib/activity/today";
import { formatKcal } from "@/lib/remaining-format";

const ONE_MINUTE = 60_000;

// The browser's clock, read again once a minute.
function subscribe(onChange: () => void): () => void {
  const timer = window.setInterval(onChange, ONE_MINUTE);
  return () => window.clearInterval(timer);
}

const browserMinutes = () => minutesSinceLocalMidnight(new Date());

// Rough calories burned today, for information only: they never change the target, the "left" numbers,
// the check-in or the meal planner (docs/ACTIVITY.md). The resting part grows with the browser's local time.
// serverMinutes is the render's minutes since midnight in the user's time zone, so the first paint and
// hydration match; the browser's own clock takes over straight after.
export function BurnedTodayCard({ burn, serverMinutes, className = "" }: { burn: TodayBurnBase; serverMinutes: number; className?: string }) {
  const minutesSinceMidnight = useSyncExternalStore(subscribe, browserMinutes, () => serverMinutes);
  const result = burnedToday({ ...burn, minutesSinceMidnight });

  const weighInLink = <Link className="font-semibold text-ink underline" href="/progress">Log a weigh-in</Link>;
  const restingMissing = burn.hasDetails ? weighInLink : <Link className="font-semibold text-ink underline" href="/profile">Add your details in Profile</Link>;
  const parts = [
    { name: "Resting", value: result.resting, missing: restingMissing },
    { name: "Workouts", value: result.workouts, missing: weighInLink },
    { name: "Steps", value: result.steps, missing: weighInLink },
    { name: "Other activity", value: result.other, missing: weighInLink },
  ];

  return (
    <section className={`card ${className}`}>
      <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="calories" />Burned today (estimate)</h2>
      {result.total !== null && (
        <p className="mt-4">
          <span className="metric">{Math.round(result.total).toLocaleString("en-US")}</span>
          <span className="ml-2 text-base text-muted">kcal</span>
        </p>
      )}
      {result.endOfDay !== null && <p className="mt-1 text-sm text-muted">About {formatKcal(result.endOfDay)} by end of day</p>}

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {parts.map((part) => (
          <div className="tile p-3" key={part.name}>
            <dt className="text-sm text-muted">{part.name}</dt>
            <dd className={part.value === null ? "mt-1 text-sm" : "mt-1 text-lg font-bold tabular-nums"}>
              {part.value === null ? part.missing : formatKcal(part.value)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted">Burned calories are rough estimates. They do not change your calorie target.</p>
    </section>
  );
}
