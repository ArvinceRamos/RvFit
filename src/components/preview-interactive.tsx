"use client";

import { useState } from "react";
import { DrawIn } from "@/components/draw-in";
import {
  barPercent,
  DEMO_MEAL,
  DEMO_PROFILE_EDIT,
  DEMO_SWAP_KEYS,
  DEMO_TARGETS,
  DEMO_WEIGHT_RANGES,
  DEMO_WORKOUT,
  demoMacroWarning,
  demoWeightWindow,
} from "@/lib/demo-data";
import { chartLayout } from "@/lib/weight-chart";
import { getExercise } from "@/lib/workouts/exercises";

// The interactive parts of the landing page App previews. Fake data only, and nothing is saved.
// Each one copies a real feature, and its first render matches the static card, so the page looks the same without scripts.

const pill = (on: boolean) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold ${on ? "bg-accent text-on-accent" : "text-muted hover:bg-line hover:text-ink"}`;

// Mirrors the meal builder (/meals/new) and the planner's eaten tick: unticking the meal takes it off today's calories.
export function MealPreviewBody() {
  const [eaten, setEaten] = useState(true);
  const today = eaten ? DEMO_MEAL.dayCalories : DEMO_MEAL.eatenBefore;
  return (
    <>
      <ul className="space-y-2">
        {DEMO_MEAL.slots.map((s) => (
          <li key={s.slot} className="flex items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span className="text-muted">{s.slot}</span>
            <span className="text-right font-semibold">{s.food} · {s.grams} g</span>
          </li>
        ))}
      </ul>
      <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
        <span>Ate {DEMO_MEAL.label} · {DEMO_MEAL.mealCalories} calories</span>
        <input
          checked={eaten}
          className="size-5 cursor-pointer accent-[var(--accent)]"
          onChange={(event) => setEaten(event.target.checked)}
          type="checkbox"
        />
      </label>
      <div className="mt-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Today</span>
          <span aria-live="polite" className="font-semibold">{today.toLocaleString("en-US")} of {DEMO_TARGETS.calories.toLocaleString("en-US")} calories</span>
        </div>
        <DrawIn>
          <div
            role="progressbar"
            aria-label="Calories so far today"
            aria-valuemin={0}
            aria-valuemax={DEMO_TARGETS.calories}
            aria-valuenow={today}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-track"
          >
            <div className="draw-fill h-full rounded-full bg-accent" style={{ width: `${barPercent(today, DEMO_TARGETS.calories)}%` }} />
          </div>
        </DrawIn>
      </div>
    </>
  );
}

// Mirrors one day on the Workouts page (/workouts). Swap cycles the first exercise through other squats from the library.
export function WorkoutPreviewBody() {
  const [pick, setPick] = useState(0);
  const swapName = getExercise(DEMO_SWAP_KEYS[pick])?.name ?? DEMO_WORKOUT.exercises[0].name;
  return (
    <ol className="space-y-2">
      {DEMO_WORKOUT.exercises.map((e, i) => (
        <li key={e.name} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
          <span className="font-semibold" aria-live={i === 0 ? "polite" : undefined}>{i === 0 ? swapName : e.name}</span>
          <span className="flex items-center gap-3">
            <span className="font-mono text-muted">{e.sets}</span>
            {i === 0 && (
              <button
                aria-label={`Swap ${swapName}`}
                className="rounded-lg border border-[var(--btn2-edge)] px-2.5 py-1 text-xs font-semibold hover:border-[var(--btn2-edge-hover)]"
                onClick={() => setPick((pick + 1) % DEMO_SWAP_KEYS.length)}
                type="button"
              >
                Swap
              </button>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

// Mirrors the weight chart on the Progress page (/progress): weigh-ins, the 7-day average, and the range buttons.
export function WeightPreviewBody() {
  const [days, setDays] = useState<number>(30);
  const box = { width: 320, height: 150, left: 34, right: 8, top: 10, bottom: 10 };
  const { weights, averages, offset } = demoWeightWindow(days);
  const layout = chartLayout(
    [
      ...weights.map((value, i) => ({ time: i, value })),
      ...averages.map((value, i) => ({ time: i + offset, value })),
    ],
    box,
  );
  if (!layout) return null;
  const raw = layout.points.slice(0, weights.length);
  const avg = layout.points.slice(weights.length);
  const path = (pts: { x: number; y: number }[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return (
    <>
      <div className="mb-3 flex gap-1" role="group" aria-label="Chart range">
        {DEMO_WEIGHT_RANGES.map((option) => (
          <button aria-pressed={days === option} className={pill(days === option)} key={option} onClick={() => setDays(option)} type="button">
            {option} days
          </button>
        ))}
      </div>
      <DrawIn>
        <svg aria-label={`Sample weight chart for the last ${days} days: daily weigh-ins and a 7-day average`} className="w-full" role="img" viewBox={`0 0 ${box.width} ${box.height}`}>
          <text className="fill-muted text-[10px]" x={box.left - 6} y={box.top + 4} textAnchor="end">{layout.yMax}</text>
          <text className="fill-muted text-[10px]" x={box.left - 6} y={box.height - box.bottom} textAnchor="end">{layout.yMin}</text>
          <line stroke="var(--line)" x1={box.left} x2={box.width - box.right} y1={box.height - box.bottom} y2={box.height - box.bottom} />
          <path className="draw-line" d={path(raw)} fill="none" pathLength={1} stroke="var(--muted)" strokeWidth={days > 30 ? 1 : 1.5} />
          {raw.map((p, i) => <circle key={i} cx={p.x} cy={p.y} fill="var(--muted)" r={days > 30 ? 1.2 : 2} />)}
          <path className="draw-line" d={path(avg)} fill="none" pathLength={1} stroke="var(--accent)" strokeLinecap="round" strokeWidth={3} />
        </svg>
      </DrawIn>
    </>
  );
}

// Mirrors the macro edit on Profile and targets (/profile). The 5% warning uses the same check as that screen.
export function ProfilePreviewBody() {
  const start = DEMO_PROFILE_EDIT.macros.find((m) => m.label === "Carbs")?.grams ?? DEMO_TARGETS.carbs;
  const [carbs, setCarbs] = useState<number>(start);
  const { carbStep, carbMin, carbMax } = DEMO_PROFILE_EDIT;
  const grams = (label: string, fallback: number) => (label === "Carbs" ? carbs : fallback);
  const warn = demoMacroWarning(carbs);
  return (
    <>
      <dl className="grid grid-cols-2 gap-3">
        {DEMO_PROFILE_EDIT.macros.map((m) => (
          <div key={m.label} className={`rounded-xl border px-3 py-2 ${m.edited ? "border-selected-edge bg-selected" : "border-line"}`}>
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="flex flex-wrap items-center justify-between gap-1 text-lg font-bold">
              <span aria-live={m.edited ? "polite" : undefined} className="whitespace-nowrap">{grams(m.label, m.grams)} g</span>
              {m.edited && (
                <span className="flex gap-1">
                  <button
                    aria-label={`Lower carbs by ${carbStep} g`}
                    className="size-7 rounded-lg border border-[var(--btn2-edge)] text-base leading-none hover:border-[var(--btn2-edge-hover)] disabled:opacity-40"
                    disabled={carbs <= carbMin}
                    onClick={() => setCarbs(Math.max(carbs - carbStep, carbMin))}
                    type="button"
                  >
                    −
                  </button>
                  <button
                    aria-label={`Raise carbs by ${carbStep} g`}
                    className="size-7 rounded-lg border border-[var(--btn2-edge)] text-base leading-none hover:border-[var(--btn2-edge-hover)] disabled:opacity-40"
                    disabled={carbs >= carbMax}
                    onClick={() => setCarbs(Math.min(carbs + carbStep, carbMax))}
                    type="button"
                  >
                    +
                  </button>
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div aria-live="polite">
        {warn && <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm text-warn">{DEMO_PROFILE_EDIT.warning}</p>}
      </div>
    </>
  );
}
