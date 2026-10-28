"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { deleteWeighInAction, loadWeightChartAction, type WeightChartResult } from "@/app/progress/actions";
import { formatSleepMinutes, type ActivityBlock } from "@/lib/activity/progress";
import { CheckInCard } from "@/components/check-in-card";
import { WeighInForm } from "@/components/weigh-in-form";
import { calculationConfig } from "@/lib/calc/config";
import { checkInReady } from "@/lib/check-in";
import type { WeighInRow } from "@/lib/overview-data";
import type { KcalDay, WeekCount } from "@/lib/progress";
import type { ChartPoint, ProgressResult } from "@/lib/progress-data";
import { formatKcal } from "@/lib/remaining-format";
import { goalPaceLabel } from "@/lib/target-options";
import { chartLayout, chartRanges, DEFAULT_CHART_RANGE, filterByRange, weightChange, type ChartRangeKey } from "@/lib/weight-chart";
import { formatLengthCm, formatWeightKg, type PreferredUnits } from "@/lib/weigh-in";
import { formatCalendarDate } from "@/lib/workouts/format";

// Weigh-in times are moments, so they are shown in the user's time zone. The server renders with the same
// zone (requestClock), so the page hydrates without a mismatch.
function momentFormats(timeZone: string) {
  return {
    dateFormat: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone }),
    shortDateFormat: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone }),
  };
}

const weekFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

function inUnits(weightKg: number, units: PreferredUnits): number {
  return units === "metric" ? weightKg : weightKg / calculationConfig.unit_conversions.pounds_to_kilograms;
}

// Calendar dates are plain "YYYY-MM-DD" text, so build the Date from its parts to avoid time zone shifts.
function shortWeek(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return weekFormat.format(new Date(year, month - 1, day));
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card !p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 metric">{value}</p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}

const changeDays = 30;

// The Fit Green tile. Black text on Fit Green only. The chip compares weekly averages (see weightChange) in plain numbers, with no
// good or bad colour, because the app does not know or judge the user's goal here.
function LatestWeightTile({ history, units, now, timeZone }: { history: WeighInRow[]; units: PreferredUnits; now: number; timeZone: string }) {
  const { dateFormat } = momentFormats(timeZone);
  const latest = history.find((row) => row.weight_kg !== null);
  const points = history
    .filter((row) => row.weight_kg !== null)
    .map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg as number, units) }));
  const change = weightChange(points, changeDays, now);
  const unit = units === "metric" ? "kg" : "lb";
  const chip = change === null
    ? null
    : Math.abs(change) < 0.05
      ? `No change in ${changeDays} days (weekly avg)`
      : `${change < 0 ? "−" : "+"}${Math.abs(change).toFixed(1)} ${unit} in ${changeDays} days (weekly avg)`;

  return (
    <div className="rounded-[22px] bg-accent p-4 text-on-accent">
      <p className="text-sm font-medium">Latest weight</p>
      <p className="mt-1 metric">{latest ? formatWeightKg(latest.weight_kg as number, units) : "—"}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span>{latest ? dateFormat.format(new Date(latest.logged_at)) : "No weigh-ins yet"}</span>
        {chip && <span className="rounded-full bg-on-accent px-2.5 py-0.5 text-xs font-semibold text-accent">{chip}</span>}
      </div>
    </div>
  );
}

// This week's workouts against the training days saved in Preferences. The ring stops at full.
function WorkoutsRingTile({ week, plannedDays }: { week: WeekCount; plannedDays: number | null }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const share = plannedDays ? Math.min(week.count / plannedDays, 1) : 0;

  return (
    <div className="card flex items-center gap-4 !p-4">
      {plannedDays ? (
        <svg aria-label={`${week.count} of ${plannedDays} planned workouts this week`} className="size-16 shrink-0 -rotate-90" role="img" viewBox="0 0 64 64">
          <circle className="stroke-track" cx="32" cy="32" fill="none" r={radius} strokeWidth="7" />
          <circle
            className="stroke-accent-text"
            cx="32"
            cy="32"
            fill="none"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - share)}
            strokeLinecap="round"
            strokeWidth={share === 0 ? 0 : 7}
          />
        </svg>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm text-muted">Workouts this week</p>
        <p className="mt-1 metric">
          {week.count}
          {plannedDays ? <span className="text-lg text-muted"> / {plannedDays}</span> : null}
        </p>
        <p className="mt-1 text-sm text-muted">
          {plannedDays ? `Week of ${formatCalendarDate(week.week_start)}` : <Link className="font-semibold text-ink underline" href="/preferences">Set training days</Link>}
        </p>
      </div>
    </div>
  );
}

const chartError = "Your weight chart could not be loaded. Please try again.";
const chartWidth = 640;
const chartHeight = 300;
const chartBox = { width: chartWidth, height: chartHeight, left: 56, right: 20, top: 24, bottom: 44 };

// A line chart of the recorded weigh-ins, drawn as inline SVG. Only recorded points: no smoothing, no goal line.
// Each range loads its own weigh-ins, so longer ranges are not limited to the History list. The page renders the
// first range on the server (initialPoints); a save or delete re-renders the page, so another open range loads again.
function WeightChartCard({ hasWeighIns, initialPoints, units, now, timeZone }: {
  hasWeighIns: boolean;
  initialPoints: ChartPoint[] | null;
  units: PreferredUnits;
  now: number;
  timeZone: string;
}) {
  const gradientId = useId();
  const { dateFormat, shortDateFormat } = momentFormats(timeZone);
  const [range, setRange] = useState<ChartRangeKey>(DEFAULT_CHART_RANGE);
  const [loaded, setLoaded] = useState<{ range: ChartRangeKey; source: ChartPoint[] | null; result: WeightChartResult }>();

  useEffect(() => {
    if (range === DEFAULT_CHART_RANGE) return;
    let cancelled = false;
    loadWeightChartAction(range)
      .catch((): WeightChartResult => ({ ok: false, error: chartError }))
      .then((result) => { if (!cancelled) setLoaded({ range, source: initialPoints, result }); });
    return () => { cancelled = true; };
  }, [range, initialPoints]);

  const current: { result: WeightChartResult } | undefined = range === DEFAULT_CHART_RANGE
    ? { result: initialPoints ? { ok: true, points: initialPoints } : { ok: false, error: chartError } }
    : loaded && loaded.range === range && loaded.source === initialPoints ? loaded : undefined;
  const loading = !current;
  // Weigh-ins arrive newest first. The chart runs oldest to newest.
  const recorded = (current?.result.ok ? current.result.points : [])
    .map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg, units) }))
    .sort((a, b) => a.time - b.time);
  const days = chartRanges.find((option) => option.key === range)?.days ?? null;
  const shown = filterByRange(recorded, days, now);

  // One point makes no line, so it is laid out as two identical points and drawn as a single dot.
  const layout = shown.length === 0 ? null : chartLayout(shown.length === 1 ? [shown[0], shown[0]] : shown, chartBox);
  const unit = units === "metric" ? "kg" : "lb";
  const baseline = chartHeight - chartBox.bottom;
  const plotRight = chartWidth - chartBox.right;

  let body: React.ReactNode;
  if (current && !current.result.ok) {
    body = <p className="alert-danger mt-4" role="alert">{current.result.error}</p>;
  } else if (!layout) {
    body = (
      <div className="relative mt-4">
        <svg aria-hidden className="h-auto w-full opacity-40" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <line className="stroke-line" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={chartBox.top} y2={chartBox.top} />
          <line className="stroke-line" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={(chartBox.top + baseline) / 2} y2={(chartBox.top + baseline) / 2} />
          <line className="stroke-edge" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={baseline} y2={baseline} />
          <polyline className="stroke-muted" fill="none" points="56,200 150,170 240,185 330,130 420,150 510,90 620,70" strokeDasharray="6 8" strokeLinecap="round" strokeWidth="3" />
        </svg>
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">
          {loading ? "Loading your chart…" : hasWeighIns ? "No weigh-ins in this range. Try a longer one." : "Add your first weigh-in to start your chart."}
        </p>
      </div>
    );
  } else {
    const first = new Date(shown[0].time);
    const last = new Date(shown[shown.length - 1].time);
    const points = shown.length === 1 ? [layout.points[0]] : layout.points;
    const line = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
    const area = points.length > 1
      ? `M${points[0].x.toFixed(1)},${baseline} ${points.map((point) => `L${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ")} L${points[points.length - 1].x.toFixed(1)},${baseline} Z`
      : null;
    const latest = points[points.length - 1];
    const summary = shown.length === 1
      ? `Weight in ${unit}, one weigh-in on ${dateFormat.format(first)}.`
      : `Weight in ${unit}, ${shown.length} weigh-ins from ${dateFormat.format(first)} to ${dateFormat.format(last)}.`;
    body = (
      <svg aria-label={summary} className="mt-4 h-auto w-full" role="img" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" style={{ stopColor: "var(--accent)", stopOpacity: 0.45 }} />
            <stop offset="100%" style={{ stopColor: "var(--accent)", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <line className="stroke-line" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={chartBox.top} y2={chartBox.top} />
        <line className="stroke-line" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={(chartBox.top + baseline) / 2} y2={(chartBox.top + baseline) / 2} />
        <line className="stroke-edge" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={baseline} y2={baseline} />
        <text className="fill-muted" fontSize="16" textAnchor="end" x={chartBox.left - 8} y={chartBox.top + 5}>{layout.yMax}</text>
        <text className="fill-muted" fontSize="16" textAnchor="end" x={chartBox.left - 8} y={baseline + 5}>{layout.yMin}</text>
        <text className="fill-muted" fontSize="16" textAnchor="start" x={chartBox.left} y={chartHeight - 14}>{shortDateFormat.format(first)}</text>
        {shown.length > 1 && <text className="fill-muted" fontSize="16" textAnchor="end" x={plotRight} y={chartHeight - 14}>{shortDateFormat.format(last)}</text>}
        {area && <path d={area} fill={`url(#${gradientId})`} />}
        {points.length > 1 && <polyline className="stroke-accent-text" fill="none" points={line} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />}
        {points.map((point, index) => (
          <circle className="fill-accent-text" cx={point.x} cy={point.y} key={index} r={index === points.length - 1 ? 6 : 3.5} />
        ))}
        <text className="fill-ink stroke-card" fontSize="16" fontWeight="600" paintOrder="stroke" strokeLinejoin="round" strokeWidth="5" textAnchor={latest.x > chartWidth - 90 ? "end" : "middle"} x={latest.x} y={latest.y - 14}>
          {shown[shown.length - 1].value.toFixed(1)} {unit}
        </text>
      </svg>
    );
  }

  return (
    <section className="card h-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">Weight chart</h2>
        <div aria-label="Chart range" className="segmented text-sm" role="group">
          {chartRanges.map((option) => (
            <button
              aria-pressed={range === option.key}
              key={option.key}
              onClick={() => setRange(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {body}
    </section>
  );
}

// Bars for the last weeks, oldest on the left. The current week is Fit Green.
const weekdayFormat = new Intl.DateTimeFormat("en", { weekday: "short" });

// Eaten calories for the last 7 days (from the Week page, AU-64). Plain numbers, no good or bad colours,
// no streaks. A day with nothing ticked as eaten shows a dash, not 0.
function KcalStrip({ days, targetKcal }: { days: KcalDay[]; targetKcal: number | null }) {
  const most = Math.max(1, targetKcal ?? 0, ...days.map((day) => day.kcal));
  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="section-title">Calories, last 7 days</h2>
        <p className="text-sm text-muted">
          {targetKcal === null ? "Meals ticked as eaten" : <>Target <span className="font-semibold text-ink">{formatKcal(targetKcal)}</span> a day</>}
        </p>
      </div>
      <ul className="mt-4 flex h-40 items-end gap-2">
        {days.map((day, index) => {
          const today = index === days.length - 1;
          const [year, month, date] = day.date.split("-").map(Number);
          const weekday = weekdayFormat.format(new Date(year, month - 1, date));
          return (
            <li className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" key={day.date}>
              <span className={`text-xs tabular-nums ${today ? "font-semibold text-ink" : "text-muted"}`}>{day.logged ? day.kcal.toLocaleString("en-US") : "—"}</span>
              <span className={`w-full rounded-t-lg ${today ? "bg-accent" : "bg-track"}`} style={{ height: `${day.logged ? Math.max(4, (day.kcal / most) * 100) : 4}px` }} />
              <span className="text-xs text-muted">{today ? "Today" : weekday}</span>
              <span className="sr-only">{formatCalendarDate(day.date)}: {day.logged ? formatKcal(day.kcal) : "nothing ticked as eaten"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Steps or Sleep: the 7-day average, then the last 7 dates (newest first) with that day's number or a dash.
// Plain numbers only: no goals, no good or bad colours. The average needs at least 3 days with a number.
function ActivityListCard({ title, block, format }: { title: string; block: ActivityBlock; format: (value: number) => string }) {
  const { average, days } = block;
  return (
    <section className="card h-full">
      <h2 className="section-title">{title}</h2>
      <p className="mt-3 text-sm text-muted">7-day average</p>
      {average.status === "ok" ? (
        <p className="metric">{format(average.value)}</p>
      ) : (
        <p className="mt-1 text-muted">Not enough data yet.</p>
      )}
      <ol className="mt-3 divide-y divide-line">
        {days.map((day) => (
          <li className="flex items-center justify-between gap-4 py-2 text-sm" key={day.date}>
            <time dateTime={day.date}>{formatCalendarDate(day.date)}</time>
            <span className={day.value === null ? "text-muted" : "font-semibold"}>
              {day.value === null ? "—" : format(day.value)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function WorkoutBars({ weeks }: { weeks: WeekCount[] }) {
  const ordered = [...weeks].reverse();
  const most = Math.max(1, ...ordered.map((week) => week.count));
  return (
    <section className="card h-full">
      <h2 className="section-title">Workouts per week</h2>
      <ul className="mt-4 flex h-44 items-end gap-2">
        {ordered.map((week, index) => {
          const current = index === ordered.length - 1;
          return (
            <li className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" key={week.week_start}>
              <span className={`text-sm ${current ? "font-semibold text-ink" : "text-muted"}`}>{week.count}</span>
              <span className={`w-full rounded-t-lg ${current ? "bg-accent" : "bg-track"}`} style={{ height: `${Math.max(4, (week.count / most) * 100)}px` }} />
              <span className="text-xs text-muted">{shortWeek(week.week_start)}</span>
              <span className="sr-only">Week of {formatCalendarDate(week.week_start)}: {week.count} {week.count === 1 ? "workout" : "workouts"}{current ? " (this week)" : ""}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Asks once inline before deleting. There is no undo. The action re-renders the page without the weigh-in.
function DeleteWeighInButton({ weighInId }: { weighInId: string }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function confirmDelete() {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await deleteWeighInAction(weighInId).catch(() => ({ ok: false as const, error: "The weigh-in could not be deleted. Please try again." }));
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
    }
  }

  if (!asking) {
    return <button className="mt-1 text-sm font-semibold text-danger underline" onClick={() => setAsking(true)} type="button">Delete</button>;
  }
  return (
    <div aria-label="Confirm delete" className="mt-2 grid gap-1" role="group">
      <p className="font-semibold">Delete this weigh-in?</p>
      <div className="flex gap-3">
        <button className="font-semibold text-danger underline disabled:opacity-60" disabled={busy} onClick={confirmDelete} type="button">{busy ? "Deleting…" : "Delete"}</button>
        <button className="font-semibold underline disabled:opacity-60" disabled={busy} onClick={() => { setAsking(false); setError(undefined); }} type="button">Cancel</button>
      </div>
      {error && <p className="text-danger" role="alert">{error}</p>}
    </div>
  );
}

// Progress, in this order (AU-64): weigh in, latest weight and trend, chart and History, calories for the last
// 7 days, the target check-in, then workouts per week. Rendered on the server with the user's today, time zone
// and one moment (now). Saves and deletes re-render the page from their server actions.
export function ProgressView({ result, now, timeZone }: { result: ProgressResult; now: number; timeZone: string }) {
  // After a check-in is accepted, its card stays to show the confirmation while progress reloads.
  const [keepCheckIn, setKeepCheckIn] = useState(false);

  if (!result.ok) return <p className="alert-danger mt-6" role="alert">{result.error}</p>;

  const { units, trend, history, weeks, plannedDays, goal, pace, checkIn, chart, kcalDays, targetKcal, activity } = result;
  const { dateFormat } = momentFormats(timeZone);
  const goalLabel = goalPaceLabel(goal, pace);
  return (
    <div className="mt-8 grid gap-[30px]">
      {goalLabel && (
        <p className="-mb-4 text-sm text-muted">
          Goal: <span className="font-semibold text-ink">{goalLabel}</span> ·{" "}
          <Link className="font-semibold text-ink underline" href="/profile">Target check-in</Link>
        </p>
      )}
      {/* Weigh in first, then the two weight numbers. One 3-column rhythm all the way down, so edges line up. */}
      <div className="grid gap-[30px] md:grid-cols-3">
        <WeighInForm preferredUnits={units} />
        <LatestWeightTile history={history} now={now} timeZone={timeZone} units={units} />
        <StatTile
          label="Weight trend"
          note={trend.status === "ok" ? `Average of ${trend.count} weigh-ins in the last ${calculationConfig.progress.trend_window_days} days` : "Not enough data yet"}
          value={trend.status === "ok" ? formatWeightKg(trend.average_kg, units) : "—"}
        />
      </div>

      <div className="grid gap-[30px] md:grid-cols-3">
        <div className="md:col-span-2">
          <WeightChartCard hasWeighIns={history.some((row) => row.weight_kg !== null)} initialPoints={chart} now={now} timeZone={timeZone} units={units} />
        </div>
        <section className="card flex flex-col">
          <h2 className="section-title">History</h2>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No weigh-ins saved yet.</p>
          ) : (
            <ol className="mt-3 max-h-64 divide-y divide-line overflow-y-auto pr-1">
              {history.map((row) => {
                const measurements = [
                  row.waist_cm !== null && `Waist ${formatLengthCm(row.waist_cm, units)}`,
                  row.chest_cm !== null && `Chest ${formatLengthCm(row.chest_cm, units)}`,
                  row.hips_cm !== null && `Hips ${formatLengthCm(row.hips_cm, units)}`,
                ].filter(Boolean);
                return (
                  <li className="py-3 text-sm" key={row.id}>
                    <div className="flex items-center justify-between gap-4">
                      <time dateTime={row.logged_at}>{dateFormat.format(new Date(row.logged_at))}</time>
                      <span className="font-semibold">{row.weight_kg === null ? "No weight" : formatWeightKg(row.weight_kg, units)}</span>
                    </div>
                    {measurements.length > 0 && <p className="mt-1 text-muted">{measurements.join(" · ")}</p>}
                    <DeleteWeighInButton weighInId={row.id} />
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <KcalStrip days={kcalDays} targetKcal={targetKcal} />

      {checkIn && (keepCheckIn || checkInReady(checkIn)) && (
        <CheckInCard checkIn={checkIn} className="" onSaved={() => setKeepCheckIn(true)} units={units} />
      )}

      <div className="grid gap-[30px] md:grid-cols-2">
        <ActivityListCard block={activity.steps} format={(value) => value.toLocaleString("en-US")} title="Steps" />
        <ActivityListCard block={activity.sleep} format={formatSleepMinutes} title="Sleep" />
      </div>

      <div className="grid gap-[30px] md:grid-cols-3">
        <div className="md:col-span-2">
          <WorkoutBars weeks={weeks} />
        </div>
        <WorkoutsRingTile plannedDays={plannedDays} week={weeks[0]} />
      </div>
    </div>
  );
}
