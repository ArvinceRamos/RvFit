"use client";

import { useCallback, useEffect, useState } from "react";
import { loadProgressAction, type ProgressResult } from "@/app/progress/actions";
import { localToday } from "@/components/today-summary";
import { WeighInForm } from "@/components/weigh-in-form";
import { calculationConfig } from "@/lib/calc/config";
import type { WeighInRow } from "@/lib/overview-data";
import { chartLayout } from "@/lib/weight-chart";
import { formatLengthCm, formatWeightKg, type PreferredUnits } from "@/lib/weigh-in";
import { formatCalendarDate } from "@/lib/workouts/format";

const cardClass = "rounded-xl border border-zinc-200 bg-white p-5";
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
const shortDateFormat = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

function inUnits(weightKg: number, units: PreferredUnits): number {
  return units === "metric" ? weightKg : weightKg / calculationConfig.unit_conversions.pounds_to_kilograms;
}

// One line chart of the recorded weigh-ins, drawn as inline SVG. Only recorded points: no smoothing, no goal line.
function WeightChart({ history, units }: { history: WeighInRow[]; units: PreferredUnits }) {
  // History arrives newest first. The chart runs oldest to newest.
  const recorded = history
    .filter((row) => row.weight_kg !== null)
    .map((row) => ({ time: new Date(row.logged_at).getTime(), value: inUnits(row.weight_kg as number, units) }))
    .sort((a, b) => a.time - b.time);
  const width = 600;
  const height = 240;
  const layout = chartLayout(recorded, { width, height, left: 60, right: 16, top: 20, bottom: 48 });
  if (!layout) return <p className="mt-3 text-sm text-zinc-700">Add at least two weigh-ins to see a chart.</p>;

  const unit = units === "metric" ? "kg" : "lb";
  const line = layout.points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const first = new Date(recorded[0].time);
  const last = new Date(recorded[recorded.length - 1].time);
  const summary = `Weight in ${unit}, ${recorded.length} weigh-ins from ${dateFormat.format(first)} to ${dateFormat.format(last)}.`;
  return (
    <svg aria-label={summary} className="mt-3 h-auto w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      <line className="stroke-zinc-300" strokeWidth="1" x1="60" x2={width - 16} y1={20} y2={20} />
      <line className="stroke-zinc-300" strokeWidth="1" x1="60" x2={width - 16} y1={height - 48} y2={height - 48} />
      <text className="fill-zinc-600" fontSize="20" textAnchor="end" x="52" y="27">{layout.yMax}</text>
      <text className="fill-zinc-600" fontSize="20" textAnchor="end" x="52" y={height - 42}>{layout.yMin}</text>
      <text className="fill-zinc-600" fontSize="20" textAnchor="start" x="60" y={height - 14}>{shortDateFormat.format(first)}</text>
      <text className="fill-zinc-600" fontSize="20" textAnchor="end" x={width - 16} y={height - 14}>{shortDateFormat.format(last)}</text>
      <text className="fill-zinc-600" fontSize="20" textAnchor="middle" x="340" y={height - 14}>{unit}</text>
      <polyline className="stroke-lime-600" fill="none" points={line} strokeLinejoin="round" strokeWidth="2.5" />
      {layout.points.map((point, index) => (
        <circle className="fill-lime-600" cx={point.x} cy={point.y} key={index} r="4" />
      ))}
    </svg>
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

  if (!result) return <p className="mt-6 text-sm text-zinc-700">Loading your progress…</p>;
  if (!result.ok) return <p className="mt-6 text-sm text-red-800">{result.error}</p>;

  const { units, trend, history, weeks } = result;
  return (
    <div className="mt-6 grid gap-6">
      <WeighInForm onSaved={onSaved} preferredUnits={units} />

      <section className={cardClass}>
        <h2 className="text-xl font-bold">Weight trend</h2>
        {trend.status === "ok" ? (
          <>
            <p className="mt-3 text-3xl font-bold tracking-tight">{formatWeightKg(trend.average_kg, units)}</p>
            <p className="mt-1 text-sm text-zinc-600">Average of {trend.count} weigh-ins in the last {calculationConfig.progress.trend_window_days} days.</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-zinc-700">Not enough data yet.</p>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-xl font-bold">Weight chart</h2>
        <WeightChart history={history} units={units} />
      </section>

      <section className={cardClass}>
        <h2 className="text-xl font-bold">History</h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-700">No weigh-ins saved yet.</p>
        ) : (
          <ol className="mt-3 divide-y divide-zinc-200">
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
                  {measurements.length > 0 && <p className="mt-1 text-zinc-600">{measurements.join(" · ")}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className={cardClass}>
        <h2 className="text-xl font-bold">Workouts per week</h2>
        <ul className="mt-3 divide-y divide-zinc-200">
          {weeks.map((week, index) => (
            <li className="flex items-center justify-between gap-4 py-2 text-sm" key={week.week_start}>
              <span>
                Week of {formatCalendarDate(week.week_start)}
                {index === 0 && <span className="ml-2 rounded-full bg-lime-400 px-2 py-0.5 text-xs font-bold text-zinc-950">This week</span>}
              </span>
              <span className={week.count > 0 ? "font-semibold" : "text-zinc-600"}>{week.count} {week.count === 1 ? "workout" : "workouts"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
