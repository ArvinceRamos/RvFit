"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { loadProgressAction, type ProgressResult } from "@/app/progress/actions";
import { localToday } from "@/components/today-summary";
import { WeighInForm } from "@/components/weigh-in-form";
import { calculationConfig } from "@/lib/calc/config";
import type { WeighInRow } from "@/lib/overview-data";
import type { WeekCount } from "@/lib/progress";
import { chartLayout, chartRanges, filterByRange, weightChange, type ChartRangeKey } from "@/lib/weight-chart";
import { formatLengthCm, formatWeightKg, type PreferredUnits } from "@/lib/weigh-in";
import { formatCalendarDate } from "@/lib/workouts/format";

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const shortDateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

function inUnits(weightKg: number, units: PreferredUnits): number {
  return units === "metric" ? weightKg : weightKg / calculationConfig.unit_conversions.pounds_to_kilograms;
}

// Calendar dates are plain "YYYY-MM-DD" text, so build the Date from its parts to avoid time zone shifts.
function shortWeek(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return shortDateFormat.format(new Date(year, month - 1, day));
}

function StatTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card !p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-medium tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-muted">{note}</p>
    </div>
  );
}

const changeDays = 30;

// The Fit Green tile. Black text on Fit Green only. The chip states the change in plain numbers, with no
// good or bad colour, because the app does not know or judge the user's goal here.
function LatestWeightTile({ history, units }: { history: WeighInRow[]; units: PreferredUnits }) {
  const [now] = useState(() => Date.now());
  const latest = history.find((row) => row.weight_kg !== null);
  const points = history
    .filter((row) => row.weight_kg !== null)
    .map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg as number, units) }));
  const change = weightChange(points, changeDays, now);
  const unit = units === "metric" ? "kg" : "lb";
  const chip = change === null
    ? null
    : Math.abs(change) < 0.05
      ? `No change in ${changeDays} days`
      : `${change < 0 ? "−" : "+"}${Math.abs(change).toFixed(1)} ${unit} in ${changeDays} days`;

  return (
    <div className="rounded-[22px] bg-accent p-4 text-on-accent">
      <p className="text-sm font-medium">Latest weight</p>
      <p className="mt-1 text-3xl font-medium tracking-tight">{latest ? formatWeightKg(latest.weight_kg as number, units) : "—"}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
        <span>{latest ? dateFormat.format(new Date(latest.logged_at)) : "No weigh-ins yet"}</span>
        {chip && <span className="rounded-full bg-black px-2.5 py-0.5 text-xs font-semibold text-white">{chip}</span>}
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
        <p className="mt-1 text-3xl font-medium tracking-tight">
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

const chartWidth = 640;
const chartHeight = 300;
const chartBox = { width: chartWidth, height: chartHeight, left: 56, right: 20, top: 24, bottom: 44 };

// A line chart of the recorded weigh-ins, drawn as inline SVG. Only recorded points: no smoothing, no goal line.
function WeightChartCard({ history, units }: { history: WeighInRow[]; units: PreferredUnits }) {
  const gradientId = useId();
  const [range, setRange] = useState<ChartRangeKey>("30");
  const [now] = useState(() => Date.now());

  // History arrives newest first. The chart runs oldest to newest.
  const recorded = history
    .filter((row) => row.weight_kg !== null)
    .map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg as number, units) }))
    .sort((a, b) => a.time - b.time);
  const days = chartRanges.find((option) => option.key === range)?.days ?? null;
  const shown = filterByRange(recorded, days, now);

  // One point makes no line, so it is laid out as two identical points and drawn as a single dot.
  const layout = shown.length === 0 ? null : chartLayout(shown.length === 1 ? [shown[0], shown[0]] : shown, chartBox);
  const unit = units === "metric" ? "kg" : "lb";
  const baseline = chartHeight - chartBox.bottom;
  const plotRight = chartWidth - chartBox.right;

  let body: React.ReactNode;
  if (!layout) {
    body = (
      <div className="relative mt-4">
        <svg aria-hidden className="h-auto w-full opacity-40" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <line className="stroke-line" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={chartBox.top} y2={chartBox.top} />
          <line className="stroke-line" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={(chartBox.top + baseline) / 2} y2={(chartBox.top + baseline) / 2} />
          <line className="stroke-edge" strokeWidth="1" x1={chartBox.left} x2={plotRight} y1={baseline} y2={baseline} />
          <polyline className="stroke-muted" fill="none" points="56,200 150,170 240,185 330,130 420,150 510,90 620,70" strokeDasharray="6 8" strokeLinecap="round" strokeWidth="3" />
        </svg>
        <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">
          {recorded.length === 0 ? "Add your first weigh-in to start your chart." : "No weigh-ins in this range. Try a longer one."}
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
        <h2 className="text-xl font-medium">Weight chart</h2>
        <div aria-label="Chart range" className="inline-flex rounded-xl border border-edge bg-field p-1" role="group">
          {chartRanges.map((option) => (
            <button
              aria-pressed={range === option.key}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${range === option.key ? "bg-accent text-on-accent" : "text-muted hover:bg-line hover:text-ink"}`}
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
function WorkoutBars({ weeks }: { weeks: WeekCount[] }) {
  const ordered = [...weeks].reverse();
  const most = Math.max(1, ...ordered.map((week) => week.count));
  return (
    <section className="card h-full">
      <h2 className="text-xl font-medium">Workouts per week</h2>
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

// Weigh-ins, the weight trend, and workouts per week. "Today" is the browser's local date.
export function ProgressView() {
  const [result, setResult] = useState<ProgressResult>();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadProgressAction(localToday())
      .then((progress) => { if (!cancelled) setResult(progress); })
      .catch(() => { if (!cancelled) setResult({ ok: false, error: "Your progress could not be loaded. Please try again." }); });
    return () => { cancelled = true; };
  }, [reload]);

  const onSaved = useCallback(() => setReload((count) => count + 1), []);

  if (!result) return <p className="mt-6 text-sm text-muted">Loading your progress…</p>;
  if (!result.ok) return <p className="mt-6 text-sm text-danger">{result.error}</p>;

  const { units, trend, history, weeks, plannedDays } = result;
  return (
    <div className="mt-8 grid gap-[30px]">
      <div className="grid gap-[30px] sm:grid-cols-3">
        <LatestWeightTile history={history} units={units} />
        <StatTile
          label="Weight trend"
          note={trend.status === "ok" ? `Average of ${trend.count} weigh-ins in the last ${calculationConfig.progress.trend_window_days} days` : "Not enough data yet"}
          value={trend.status === "ok" ? formatWeightKg(trend.average_kg, units) : "—"}
        />
        <WorkoutsRingTile plannedDays={plannedDays} week={weeks[0]} />
      </div>

      {/* One 3-column rhythm: the chart and the bars take two columns, the form and History one, so edges line up. */}
      <div className="grid gap-[30px] md:grid-cols-3">
        <div className="md:col-span-2">
          <WeightChartCard history={history} units={units} />
        </div>
        <WeighInForm onSaved={onSaved} preferredUnits={units} />
      </div>

      <div className="grid gap-[30px] md:grid-cols-3">
        <div className="md:col-span-2">
          <WorkoutBars weeks={weeks} />
        </div>
        <section className="card flex flex-col">
          <h2 className="text-xl font-medium">History</h2>
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
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
