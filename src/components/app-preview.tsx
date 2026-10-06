import { DrawIn } from "@/components/draw-in";
import { PreviewFrame } from "@/components/preview-frame";
import { MealPreviewBody, ProfilePreviewBody, WeightPreviewBody, WorkoutPreviewBody } from "@/components/preview-interactive";
import { barPercent, DEMO_MEAL, DEMO_RESULT, DEMO_TARGETS, DEMO_TODAY, DEMO_WORKOUT, DEMO_WORKOUT_WEEKS } from "@/lib/demo-data";

// Small panels with fake data from src/lib/demo-data.ts. Not real user data.
// Each panel notes the screen it mirrors. Update the panel when that screen changes.
// Stages 2-5 have one small interaction each (src/components/preview-interactive.tsx). Nothing is saved.

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

// Mirrors the meal builder (/meals/new) and the planner's eaten tick, plus the day's calories.
function MealPreview() {
  return (
    <PreviewFrame title={DEMO_MEAL.label}>
      <MealPreviewBody />
    </PreviewFrame>
  );
}

// Mirrors one day on the Workouts page (/workouts), with a Swap button on the first exercise.
function WorkoutPreview() {
  return (
    <PreviewFrame title={`${DEMO_WORKOUT.day} · ${DEMO_WORKOUT.name}`}>
      <WorkoutPreviewBody />
    </PreviewFrame>
  );
}

// Mirrors the weight chart on the Progress page (/progress): weigh-ins, the 7-day average and the range buttons.
function WeightPreview() {
  return (
    <PreviewFrame title="Weight (kg)">
      <WeightPreviewBody />
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

// Mirrors the macro edit on Profile and targets (/profile), with −/+ on carbs and the 5% warning.
function ProfilePreview() {
  return (
    <PreviewFrame title="Edit your macros">
      <ProfilePreviewBody />
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
