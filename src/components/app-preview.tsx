import { DrawIn } from "@/components/draw-in";
import { PreviewFrame } from "@/components/preview-frame";
import {
  barPercent,
  DEMO_MEAL,
  DEMO_PROFILE_EDIT,
  DEMO_RESULT,
  DEMO_TARGETS,
  DEMO_TODAY,
  DEMO_WEIGHTS_KG,
  DEMO_WORKOUT,
  DEMO_WORKOUT_WEEKS,
  sevenDayAverages,
} from "@/lib/demo-data";
import { chartLayout } from "@/lib/weight-chart";

// Small static panels with fake data from src/lib/demo-data.ts. Not real user data.
// Each panel notes the screen it mirrors. Update the panel when that screen changes.

// Mirrors the results screen (/results). Shows targets only, no calorie math.
function ResultPreview() {
  return (
    <PreviewFrame title={DEMO_RESULT.heading}>
      <p className="text-4xl font-bold tracking-tight">
        {DEMO_TARGETS.calories.toLocaleString("en-US")} <span className="text-base font-normal text-muted">calories a day</span>
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        {DEMO_RESULT.macros.map((m) => (
          <div key={m.label} className="rounded-xl border border-line px-3 py-2">
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="text-lg font-bold">{m.grams} g</dd>
          </div>
        ))}
      </dl>
    </PreviewFrame>
  );
}

// Mirrors the meal builder (/meals/new): four slots, plus the day's calories.
function MealPreview() {
  const pct = barPercent(DEMO_MEAL.dayCalories, DEMO_TARGETS.calories);
  return (
    <PreviewFrame title={DEMO_MEAL.label}>
      <ul className="space-y-2">
        {DEMO_MEAL.slots.map((s) => (
          <li key={s.slot} className="flex items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span className="text-muted">{s.slot}</span>
            <span className="text-right font-semibold">{s.food} · {s.grams} g</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Today</span>
          <span className="font-semibold">{DEMO_MEAL.dayCalories.toLocaleString("en-US")} of {DEMO_TARGETS.calories.toLocaleString("en-US")} calories</span>
        </div>
        <DrawIn>
          <div
            role="progressbar"
            aria-label="Calories so far today"
            aria-valuemin={0}
            aria-valuemax={DEMO_TARGETS.calories}
            aria-valuenow={DEMO_MEAL.dayCalories}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-track"
          >
            <div className="draw-fill h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </DrawIn>
      </div>
    </PreviewFrame>
  );
}

// Mirrors one day on the Workouts page (/workouts).
function WorkoutPreview() {
  return (
    <PreviewFrame title={`${DEMO_WORKOUT.day} · ${DEMO_WORKOUT.name}`}>
      <ol className="space-y-2">
        {DEMO_WORKOUT.exercises.map((e) => (
          <li key={e.name} className="flex items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2 text-sm">
            <span className="font-semibold">{e.name}</span>
            <span className="font-mono text-muted">{e.sets}</span>
          </li>
        ))}
      </ol>
    </PreviewFrame>
  );
}

// Mirrors the weight chart on the Progress page (/progress): weigh-ins plus the 7-day average.
function WeightPreview() {
  const box = { width: 320, height: 150, left: 34, right: 8, top: 10, bottom: 10 };
  const weights = [...DEMO_WEIGHTS_KG];
  const averages = sevenDayAverages(weights);
  const offset = weights.length - averages.length;
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
    <PreviewFrame title="Weight (kg)">
      <DrawIn>
        <svg aria-label="Sample weight chart: daily weigh-ins and a 7-day average" className="w-full" role="img" viewBox={`0 0 ${box.width} ${box.height}`}>
          <text className="fill-muted text-[10px]" x={box.left - 6} y={box.top + 4} textAnchor="end">{layout.yMax}</text>
          <text className="fill-muted text-[10px]" x={box.left - 6} y={box.height - box.bottom} textAnchor="end">{layout.yMin}</text>
          <line stroke="var(--line)" x1={box.left} x2={box.width - box.right} y1={box.height - box.bottom} y2={box.height - box.bottom} />
          <path className="draw-line" d={path(raw)} fill="none" pathLength={1} stroke="var(--muted)" strokeWidth={1.5} />
          {raw.map((p, i) => <circle key={i} cx={p.x} cy={p.y} fill="var(--muted)" r={2} />)}
          <path className="draw-line" d={path(avg)} fill="none" pathLength={1} stroke="var(--accent)" strokeLinecap="round" strokeWidth={3} />
        </svg>
      </DrawIn>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
        <span><span aria-hidden="true" className="mr-1.5 inline-block size-2 rounded-full bg-muted" />Weigh-ins</span>
        <span><span aria-hidden="true" className="mr-1.5 inline-block h-1 w-4 rounded-full bg-accent align-middle" />7-day average</span>
      </p>
    </PreviewFrame>
  );
}

// Mirrors the workouts-per-week bars on the Progress page (/progress). The current week is the green bar.
function WorkoutsPerWeekPreview() {
  const { counts, planned } = DEMO_WORKOUT_WEEKS;
  const box = { width: 320, height: 120, base: 100, top: 8, barWidth: 30 };
  const step = box.width / counts.length;
  return (
    <PreviewFrame title="Workouts per week">
      <DrawIn>
        <svg aria-label="Sample workouts per week for the last 6 weeks" className="w-full" role="img" viewBox={`0 0 ${box.width} ${box.height}`}>
          {counts.map((count, i) => {
            const h = (count / planned) * (box.base - box.top);
            const current = i === counts.length - 1;
            const x = i * step + (step - box.barWidth) / 2;
            return (
              <g key={i}>
                <rect className="draw-bar" fill={current ? "var(--accent)" : "var(--track)"} height={h} rx={5} width={box.barWidth} x={x} y={box.base - h} />
                <text className={`text-[10px] ${current ? "fill-ink font-bold" : "fill-muted"}`} textAnchor="middle" x={x + box.barWidth / 2} y={box.height - 4}>{current ? "Now" : `W${i + 1}`}</text>
              </g>
            );
          })}
        </svg>
      </DrawIn>
    </PreviewFrame>
  );
}

// Mirrors the macro edit on Profile and targets (/profile), including the 5% warning.
function ProfilePreview() {
  return (
    <PreviewFrame title="Edit your macros">
      <dl className="grid grid-cols-2 gap-3">
        {DEMO_PROFILE_EDIT.macros.map((m) => (
          <div key={m.label} className={`rounded-xl border px-3 py-2 ${m.edited ? "border-selected-edge bg-selected" : "border-line"}`}>
            <dt className="text-xs text-muted">{m.label}</dt>
            <dd className="text-lg font-bold">{m.grams} g</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-lg bg-warn-bg p-3 text-sm text-warn">{DEMO_PROFILE_EDIT.warning}</p>
    </PreviewFrame>
  );
}

export function StagePreview({ stage }: { stage: number }) {
  if (stage === 1) return <ResultPreview />;
  if (stage === 2) return <MealPreview />;
  if (stage === 3) return <WorkoutPreview />;
  if (stage === 4) {
    return (
      <div className="space-y-5">
        <WeightPreview />
        <WorkoutsPerWeekPreview />
      </div>
    );
  }
  if (stage === 5) return <ProfilePreview />;
  return null;
}

// Static panel for the hero. Mirrors the Dashboard's today summary (/dashboard): calories and macros so far.
// One macro bar is green and the rest are grey.
// The bars fill in: on load on desktop (fill-on-load), or when scrolled into view on smaller screens (DrawIn).
export function HeroPanel() {
  return (
    <PreviewFrame title="Today">
      <DrawIn>
        <p className="text-3xl font-bold tracking-tight">
          {DEMO_TODAY.calories.toLocaleString("en-US")}
          <span className="text-base font-normal text-muted"> of {DEMO_TARGETS.calories.toLocaleString("en-US")} calories</span>
        </p>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-track">
          <div className="draw-fill fill-on-load h-full rounded-full bg-accent" style={{ width: `${barPercent(DEMO_TODAY.calories, DEMO_TARGETS.calories)}%` }} />
        </div>
        <ul className="mt-6 space-y-3">
          {DEMO_TODAY.macros.map((m) => (
            <li key={m.label}>
              <div className="flex justify-between text-sm">
                <span className="text-muted">{m.label}</span>
                <span className="font-semibold">{m.grams} of {m.target} g</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track">
                <div className={`draw-fill fill-on-load h-full rounded-full ${m.lead ? "bg-accent" : "bg-muted"}`} style={{ width: `${barPercent(m.grams, m.target)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </DrawIn>
    </PreviewFrame>
  );
}
