"use client";

import { useState } from "react";
import { DrawIn } from "@/components/draw-in";
import { PreviewFrame } from "@/components/preview-frame";
import {
  barPercent,
  DEMO_MEAL,
  DEMO_OWN_TARGET,
  DEMO_PROFILE_EDIT,
  DEMO_RESULT,
  DEMO_SWAP_KEYS,
  DEMO_TARGETS,
  DEMO_WEIGHT_RANGES,
  DEMO_WORKOUT,
  demoMacroWarning,
  demoWeightWindow,
} from "@/lib/demo-data";
import { chartLayout } from "@/lib/weight-chart";
import { getExercise } from "@/lib/workouts/exercises";
import { restText, schemeText } from "@/lib/workouts/format";
import type { MovementPattern } from "@/lib/workouts/types";

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

// Mirrors the results screen (/results) and the two ways in on /start: "Calculate my estimate" or "Enter my own target".
// Shows targets only, no calorie math, laid out like the results screen: the big calorie number, then macros.
const MACRO_DOTS: Record<string, string> = {
  Protein: "bg-accent",
  Carbs: "bg-accent-soft",
  Fat: "bg-muted",
  Fiber: "border-2 border-muted",
};

export function ResultPreviewCard() {
  const [own, setOwn] = useState(false);
  const result = own
    ? DEMO_OWN_TARGET
    : { heading: DEMO_RESULT.heading, calories: DEMO_TARGETS.calories, macros: DEMO_RESULT.macros };
  return (
    <PreviewFrame title={result.heading}>
      <div className="flex gap-1 rounded-xl bg-field p-1" role="group" aria-label="Target type">
        {[
          { label: "Estimate", on: !own },
          { label: "My own target", on: own },
        ].map((option) => (
          <button
            aria-pressed={option.on}
            className={`flex-1 ${pill(option.on)}`}
            key={option.label}
            onClick={() => setOwn(option.label !== "Estimate")}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-accent-text">{own ? "Your target" : "Your starting estimate"}</p>
      <p aria-live="polite" className="mt-1 text-4xl font-bold tracking-tight">
        {result.calories.toLocaleString("en-US")} <span className="text-base font-normal text-muted">kcal a day</span>
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {result.macros.map((m) => (
          <div key={m.label} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
            <dt className="flex items-center gap-2 text-muted">
              <span aria-hidden="true" className={`size-2.5 rounded-full ${MACRO_DOTS[m.label] ?? "bg-muted"}`} />
              {m.label}
            </dt>
            <dd className="font-mono font-semibold">{m.grams} g</dd>
          </div>
        ))}
      </dl>
    </PreviewFrame>
  );
}

// Short tags for the movement pattern each exercise trains.
const PATTERN_TAGS: Record<MovementPattern, string> = {
  squat: "Squat",
  hinge: "Hinge",
  single_leg: "Single leg",
  horizontal_push: "Push",
  vertical_push: "Press",
  horizontal_pull: "Pull",
  vertical_pull: "Pull-down",
  side_delt: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  core: "Core",
  calves: "Calves",
};

// Mirrors one day card on the Workouts page (/workouts): the plan, form cues and Swap.
// Names, cues and plan text all come from the real workout code. Swap cycles the first exercise
// through other squats, like the Swap control. Nothing is logged or saved.
export function WorkoutPreviewBody() {
  const [pick, setPick] = useState(0);
  const { exerciseKeys, scheme, holdScheme } = DEMO_WORKOUT;
  const keys = [DEMO_SWAP_KEYS[pick], ...exerciseKeys.slice(1)];
  const exercises = keys.map((key) => getExercise(key)).filter((exercise) => exercise !== undefined);
  const planFor = (exercise: { measure: string }) => (exercise.measure === "seconds" ? holdScheme : scheme);
  const totalSets = exercises.reduce((sum, exercise) => sum + planFor(exercise).sets, 0);
  const rests = exercises.map((exercise) => planFor(exercise).restSeconds);
  const stats = [
    { label: "Exercises", value: String(exercises.length) },
    { label: "Sets", value: String(totalSets) },
    { label: "Rest", value: `${Math.min(...rests)}–${Math.max(...rests)} s` },
  ];
  return (
    <>
      <dl className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="tile px-3 py-2">
            <dt className="text-xs text-muted">{stat.label}</dt>
            <dd className="whitespace-nowrap font-mono text-base font-semibold leading-tight sm:text-lg">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <ol className="mt-4">
        {exercises.map((exercise, i) => {
          const plan = planFor(exercise);
          const unit = exercise.measure === "seconds" ? "sec" : "reps";
          const lastRow = i === exercises.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
              {!lastRow && <span aria-hidden="true" className="absolute top-8 bottom-1 left-[13px] w-px bg-line" />}
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-on-accent"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold" aria-live={i === 0 ? "polite" : undefined}>{exercise.name}</span>
                      <span className="rounded-full border border-line px-2 py-px text-[11px] font-medium uppercase tracking-wide text-muted">
                        {PATTERN_TAGS[exercise.pattern]}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-2 sm:block sm:text-right">
                    <p className="font-mono text-sm font-semibold" aria-label={schemeText(plan, exercise)}>
                      {plan.sets} × {plan.reps.min}–{plan.reps.max}
                      <span className="ml-1 text-[11px] font-normal text-muted">{unit}</span>
                    </p>
                    <p className="text-[11px] text-muted">{restText(plan)}</p>
                  </div>
                </div>
                {exercise.cue && <p className="mt-1 text-xs text-muted">{exercise.cue}</p>}
                {i === 0 && (
                  <button
                    aria-label={`Swap ${exercise.name}`}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent-text hover:bg-accent/20"
                    onClick={() => setPick((pick + 1) % DEMO_SWAP_KEYS.length)}
                    type="button"
                  >
                    <span aria-hidden="true">↻</span> Swap
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">Log each set&apos;s reps and weight on the next screen.</p>
    </>
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
                    className="size-7 rounded-lg border border-btn2-edge text-base leading-none hover:border-btn2-edge-hover disabled:opacity-40"
                    disabled={carbs <= carbMin}
                    onClick={() => setCarbs(Math.max(carbs - carbStep, carbMin))}
                    type="button"
                  >
                    −
                  </button>
                  <button
                    aria-label={`Raise carbs by ${carbStep} g`}
                    className="size-7 rounded-lg border border-btn2-edge text-base leading-none hover:border-btn2-edge-hover disabled:opacity-40"
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
        {warn && <p className="mt-4 alert-warn">{DEMO_PROFILE_EDIT.warning}</p>}
      </div>
    </>
  );
}
