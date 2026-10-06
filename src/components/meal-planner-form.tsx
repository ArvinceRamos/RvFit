"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadPlanDaysAction, saveMealPlanAction } from "@/app/meals/actions";
import { FoodAutocomplete } from "@/components/food-autocomplete";
import { calculationConfig, type PortionClass } from "@/lib/calc/config";
import { formatFiber } from "@/lib/food-catalog";
import { isCalendarDate, type MealTotals } from "@/lib/meal";
import type { BuilderFood } from "@/lib/meal-foods";
import {
  buildMealPlan,
  plannerGroups,
  type LoggedDay,
  type PlannedDay,
  type PlannedItem,
  type PlannerGroup,
  type Rotation,
} from "@/lib/meal-planner";
import { suggestFoodsByRole, type DailyTargets, type Exclusions } from "@/lib/suggestions";

const limits = calculationConfig.meal_planner;
const mealCounts = Array.from(
  { length: limits.meals_per_day.max - limits.meals_per_day.min + 1 },
  (_, index) => limits.meals_per_day.min + index,
);

const groupLabels: Record<PlannerGroup, string> = { protein: "Protein", carb: "Carbs", fat: "Fats" };
// Names for foods counted in whole units: [one, many].
const unitNames: Partial<Record<PortionClass, [string, string]>> = {
  powder: ["scoop", "scoops"],
  egg: ["egg", "eggs"],
  egg_white: ["egg white", "egg whites"],
  bread: ["piece", "pieces"],
};
const rotationOptions: { value: Rotation; label: string; hint: string }[] = [
  { value: "mix", label: "Mix", hint: "All picked foods spread over each day's meals." },
  { value: "same", label: "Same", hint: "The first food every day." },
  { value: "alternate", label: "Alternate", hint: "One food per day, in turn." },
];

type Picks = Record<PlannerGroup, BuilderFood[]>;
type Preview = { days: PlannedDay<BuilderFood>[]; logged: Record<string, LoggedDay> };

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Plan dates are plain calendar dates, so format the parts directly to avoid time zone shifts.
function formatPlanDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(year, month - 1, day));
}

function describeAmount(item: PlannedItem<BuilderFood>): string {
  if (item.units === null || !item.food.portion_class) return `${item.grams} g`;
  const [one, many] = unitNames[item.food.portion_class] ?? ["unit", "units"];
  return `${item.units} ${item.units === 1 ? one : many} (${item.grams} g)`;
}

function describeTotals(totals: MealTotals): string {
  return `${Math.round(totals.kcal)} kcal · Protein ${totals.protein_g.toFixed(1)} g · Carbs ${totals.carbs_g.toFixed(1)} g · Fat ${totals.fat_g.toFixed(1)} g`;
}

function Choice({ name, checked, onChange, children }: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold ${checked ? "border-accent bg-accent text-on-accent" : "border-edge bg-field"}`}>
      <input checked={checked} className="sr-only" name={name} onChange={onChange} type="radio" />
      {children}
    </label>
  );
}

function DayCard({ day, logged }: { day: PlannedDay<BuilderFood>; logged: LoggedDay | undefined }) {
  const rows = [
    { name: "Protein", planned: day.totals.protein_g, budget: day.budget.protein_g },
    { name: "Carbs", planned: day.totals.carbs_g, budget: day.budget.carbs_g },
    { name: "Fat", planned: day.totals.fat_g, budget: day.budget.fat_g },
  ];
  return (
    <article className="card grid content-start gap-4">
      <header>
        <h3 className="text-lg font-bold">{formatPlanDate(day.date)}</h3>
        {logged && day.status === "planned" && (
          <p className="text-sm text-muted">Planned for what is left after {logged.labels.length} logged {logged.labels.length === 1 ? "meal" : "meals"}.</p>
        )}
      </header>

      {day.status === "met" && <p className="text-sm font-semibold">Already met. No meals planned.</p>}
      {day.status === "meals_logged" && day.notes.map((note) => <p className="text-sm font-semibold" key={note}>{note}</p>)}

      {day.meals.map((meal) => (
        <section key={meal.label}>
          <h4 className="font-semibold">{meal.label}{meal.kind === "shake" && <span className="font-normal text-muted"> · Shake</span>}</h4>
          <ul className="mt-1 grid gap-0.5 text-sm">
            {meal.items.map((item) => (
              <li className="flex justify-between gap-3" key={item.food.id}>
                <span className="min-w-0">{item.food.name}</span>
                <span className="shrink-0 font-semibold">{describeAmount(item)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted">{describeTotals(meal.totals)}</p>
        </section>
      ))}

      {day.status === "planned" && (
        <div className="border-t border-line pt-3 text-sm">
          <p className="font-semibold">Day plan: {Math.round(day.totals.kcal)} kcal</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {rows.map((row) => (
              <div className="contents" key={row.name}>
                <dt className="text-muted">{row.name}</dt>
                <dd className="text-right">{Math.round(row.planned)} / {Math.round(row.budget)} g</dd>
              </div>
            ))}
            <dt className="text-muted">Fiber</dt>
            <dd className="text-right">{day.totals.fiber_incomplete ? "Incomplete" : formatFiber(day.totals.fiber_g)}</dd>
          </dl>
          {day.notes.length > 0 && (
            <ul className="mt-3 grid gap-1 text-muted">
              {day.notes.map((note) => <li key={note}>{note}</li>)}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

export function MealPlannerForm({ foods, target, exclusions }: {
  foods: BuilderFood[];
  target: DailyTargets;
  exclusions: Exclusions;
}) {
  const router = useRouter();
  const [length, setLength] = useState<"day" | "week">("day");
  const [startDate, setStartDate] = useState(localToday);
  const [mealsPerDay, setMealsPerDay] = useState<number>(limits.meals_per_day.default);
  const [rotations, setRotations] = useState<Record<PlannerGroup, Rotation>>({ protein: "mix", carb: "mix", fat: "mix" });
  const [picks, setPicks] = useState<Picks>({ protein: [], carb: [], fat: [] });
  const [searches, setSearches] = useState<Record<PlannerGroup, string>>({ protein: "", carb: "", fat: "" });
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Common foods for one-tap picks: the top of the existing suggestion ranking for the full day target.
  const common = new Map(suggestFoodsByRole(foods, target, exclusions).map((entry) => [entry.role, entry.foods.map((ranked) => ranked.food)]));
  const days = length === "day" ? 1 : limits.max_days;
  const pickedCount = plannerGroups.reduce((sum, group) => sum + picks[group].length, 0);
  const plannedMeals = preview?.days.flatMap((day) => day.meals.map((meal) => ({ day, meal }))) ?? [];

  // Any change to the inputs makes the preview out of date.
  function changed() {
    setPreview(undefined);
    setConfirming(false);
    setMessage(undefined);
    setSaveError(undefined);
  }

  function addPick(group: PlannerGroup, food: BuilderFood) {
    if (picks[group].some((picked) => picked.id === food.id) || picks[group].length >= limits.max_foods_per_group) return;
    setPicks((current) => ({ ...current, [group]: [...current[group], food] }));
    setSearches((current) => ({ ...current, [group]: "" }));
    changed();
  }

  function removePick(group: PlannerGroup, id: string) {
    setPicks((current) => ({ ...current, [group]: current[group].filter((food) => food.id !== id) }));
    changed();
  }

  async function makePreview() {
    changed();
    if (!isCalendarDate(startDate)) {
      setMessage("Choose a valid start date.");
      return;
    }
    setBusy(true);
    const loaded = await loadPlanDaysAction(startDate, days).catch(() => ({ ok: false }) as const);
    setBusy(false);
    if (!loaded.ok) {
      setMessage("Your logged meals could not be loaded. Please try again.");
      return;
    }
    const result = buildMealPlan({ startDate, days, mealsPerDay, targets: target, foods: picks, rotations, exclusions, logged: loaded.logged });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setPreview({ days: result.data, logged: loaded.logged });
  }

  async function save() {
    setBusy(true);
    setSaveError(undefined);
    const result = await saveMealPlanAction({
      meals: plannedMeals.map(({ day, meal }) => ({
        date: day.date,
        label: meal.label,
        items: meal.items.map((item) => ({ foodId: item.food.id, grams: item.grams })),
      })),
    }).catch(() => ({ ok: false, error: "Your plan could not be saved. Please try again." }) as const);
    if (!result.ok) {
      setBusy(false);
      setConfirming(false);
      setSaveError(result.error);
      return;
    }
    router.push("/meals");
  }

  return (
    <div className="mt-6 grid gap-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="card grid content-start gap-5">
          <h2 className="text-xl font-bold">Plan</h2>
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-semibold">Length</legend>
            <div className="flex flex-wrap gap-2">
              <Choice checked={length === "day"} name="length" onChange={() => { setLength("day"); changed(); }}>Day</Choice>
              <Choice checked={length === "week"} name="length" onChange={() => { setLength("week"); changed(); }}>Week</Choice>
            </div>
          </fieldset>
          <label className="grid gap-1 text-sm font-semibold">
            {length === "day" ? "Date" : "Start date (7 days)"}
            <input className="field" onChange={(event) => { setStartDate(event.target.value); changed(); }} suppressHydrationWarning type="date" value={startDate} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Meals per day
            <select className="field" onChange={(event) => { setMealsPerDay(Number(event.target.value)); changed(); }} value={mealsPerDay}>
              {mealCounts.map((count) => <option key={count} value={count}>{count}</option>)}
            </select>
          </label>
          {length === "week" ? (
            <fieldset className="grid gap-3">
              <legend className="mb-1 text-sm font-semibold">Week rotation</legend>
              {plannerGroups.map((group) => (
                <label className="grid gap-1 text-sm" key={group}>
                  <span className="font-semibold">{groupLabels[group]}</span>
                  <select
                    className="field"
                    onChange={(event) => { setRotations((current) => ({ ...current, [group]: event.target.value as Rotation })); changed(); }}
                    value={rotations[group]}
                  >
                    {rotationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <span className="text-xs text-muted">{rotationOptions.find((option) => option.value === rotations[group])?.hint}</span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="text-sm text-muted">A day plan spreads all picked foods over its meals.</p>
          )}
        </section>

        <section className="card grid content-start gap-6">
          <div>
            <h2 className="text-xl font-bold">Foods you have</h2>
            <p className="mt-1 text-sm text-muted">Up to {limits.max_foods_per_group} per group. Each meal uses one protein, one carb, and one fat food, plus a second one when a portion is full. Portions stay within normal sizes.</p>
          </div>
          {plannerGroups.map((group) => {
            const picked = picks[group];
            const pickedIds = new Set(picked.map((food) => food.id));
            const full = picked.length >= limits.max_foods_per_group;
            const quick = (common.get(group) ?? []).filter((food) => !pickedIds.has(food.id));
            return (
              <div className="grid gap-2" key={group}>
                {full ? (
                  <p className="text-sm font-semibold">{groupLabels[group]} <span className="font-normal text-muted">(the most for this group)</span></p>
                ) : (
                  <FoodAutocomplete
                    foods={foods.filter((food) => food.role === group && !pickedIds.has(food.id))}
                    label={groupLabels[group]}
                    onSelect={(food) => {
                      const found = foods.find((candidate) => candidate.id === food.id);
                      if (found) addPick(group, found);
                    }}
                    onValueChange={(value) => setSearches((current) => ({ ...current, [group]: value }))}
                    placeholder="Start typing a food name"
                    value={searches[group]}
                  />
                )}
                {picked.length > 0 && (
                  <ul aria-label={`Picked ${groupLabels[group]} foods`} className="flex flex-wrap gap-2">
                    {picked.map((food) => (
                      <li className="inline-flex items-center gap-2 rounded-full border border-selected-edge bg-selected px-3 py-1 text-sm" key={food.id}>
                        {food.name}
                        <button aria-label={`Remove ${food.name}`} className="font-bold text-muted hover:text-ink" onClick={() => removePick(group, food.id)} type="button">×</button>
                      </li>
                    ))}
                  </ul>
                )}
                {picked.some((food) => food.portion_class === "powder") && (
                  <p className="text-xs text-muted">Whey is planned as a separate shake, in whole scoops, only when meals leave protein short.</p>
                )}
                {!full && quick.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">Common:</span>
                    {quick.map((food) => (
                      <button className="rounded-full border border-edge bg-field px-3 py-1 text-xs font-semibold" key={food.id} onClick={() => addPick(group, food)} type="button">
                        + {food.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>

      <div className="grid gap-3">
        <button className="btn-primary w-fit disabled:cursor-not-allowed disabled:opacity-60" disabled={busy || pickedCount === 0} onClick={makePreview} type="button">
          {busy && !preview ? "Planning…" : "Preview plan"}
        </button>
        {pickedCount === 0 && <p className="text-sm text-muted">Pick at least one food to preview a plan.</p>}
        {message && <p aria-live="polite" className="text-sm text-danger">{message}</p>}
      </div>

      {preview && (
        <section className="grid gap-4">
          <h2 className="text-xl font-bold">Preview</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {preview.days.map((day) => <DayCard day={day} key={day.date} logged={preview.logged[day.date]} />)}
          </div>

          {plannedMeals.length === 0 ? (
            <p className="text-sm text-muted">Nothing to save. No meals were planned.</p>
          ) : confirming ? (
            <div aria-live="polite" className="flex flex-wrap items-center gap-3 text-sm">
              <span>Save {plannedMeals.length} {plannedMeals.length === 1 ? "meal" : "meals"} to your log?</span>
              <button className="btn-primary disabled:opacity-60" disabled={busy} onClick={save} type="button">{busy ? "Saving…" : "Yes"}</button>
              <button className="btn-secondary disabled:opacity-60" disabled={busy} onClick={() => setConfirming(false)} type="button">No</button>
            </div>
          ) : (
            <button className="btn-primary w-fit" onClick={() => setConfirming(true)} type="button">Save as meals</button>
          )}
          {saveError && <p aria-live="polite" className="text-sm text-danger">{saveError}</p>}
        </section>
      )}
    </div>
  );
}
