"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadDayTotalsAction, saveMealAction, type DayTotalsResult } from "@/app/meals/actions";
import { FoodAutocomplete } from "@/components/food-autocomplete";
import { SuggestionsPanel, type SuggestionsView } from "@/components/suggestions-panel";
import { formatFiber, stateLabels } from "@/lib/food-catalog";
import {
  addTotals,
  describeNutrition,
  isCalendarDate,
  itemNutrition,
  maxMealLabelLength,
  mealTotals,
  measureToGrams,
  parseAmount,
  validateGrams,
} from "@/lib/meal";
import type { SuggestionContext } from "@/lib/meal-context";
import type { BuilderFood } from "@/lib/meal-foods";
import { remainingTargets, suggestFoodsByRole } from "@/lib/suggestions";

export type MealBuilderInitial = {
  mealId: string | null;
  date: string;
  label: string;
  items: { foodId: string; grams: number }[];
};

type ItemState = { key: number; food: BuilderFood; amount: string; unit: string };

const gramsUnit = "grams";
const savedMessage = "Meal saved.";
const fieldClass = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal";

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function unitGrams(item: ItemState): number {
  return item.unit === gramsUnit ? 1 : (item.food.measures[Number(item.unit)]?.grams ?? 1);
}

// The grams for an item, or the reason its amount is not usable yet.
function itemGrams(item: ItemState): { ok: true; grams: number } | { ok: false; error: string } {
  const amount = parseAmount(item.amount);
  if (amount === null) return { ok: false, error: "Enter an amount." };
  const checked = validateGrams(measureToGrams(unitGrams(item), amount));
  return checked.ok ? { ok: true, grams: checked.data } : checked;
}

export function MealBuilder({ foods, initial, suggestionContext }: {
  foods: BuilderFood[];
  initial: MealBuilderInitial;
  suggestionContext: SuggestionContext;
}) {
  const router = useRouter();
  const nextKey = useRef(initial.items.length);
  const foodsById = new Map(foods.map((food) => [food.id, food]));
  const [label, setLabel] = useState(initial.label);
  const [date, setDate] = useState(initial.date || localToday());
  const [items, setItems] = useState<ItemState[]>(() =>
    initial.items.flatMap((item, index) => {
      const food = foodsById.get(item.foodId);
      return food ? [{ key: index, food, amount: String(item.grams), unit: gramsUnit }] : [];
    }),
  );
  const [search, setSearch] = useState("");
  const [focusKey, setFocusKey] = useState<number>();
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  const checked = items.map((item) => ({ item, grams: itemGrams(item) }));
  const usable = checked.flatMap(({ item, grams }) => (grams.ok ? [{ food: item.food.nutrition, grams: grams.grams }] : []));
  const totals = mealTotals(usable);
  const hasUnusableItem = checked.some(({ grams }) => !grams.ok);

  // Saved meals on the chosen date, fetched again whenever the date changes.
  const target = suggestionContext.status === "ready" ? suggestionContext.target : null;
  const needsDayTotals = target !== null && isCalendarDate(date);
  const [day, setDay] = useState<{ date: string; result: DayTotalsResult }>();
  useEffect(() => {
    if (!needsDayTotals) return;
    let cancelled = false;
    loadDayTotalsAction(date, initial.mealId)
      .then((result) => { if (!cancelled) setDay({ date, result }); })
      .catch(() => { if (!cancelled) setDay({ date, result: { ok: false } }); });
    return () => { cancelled = true; };
  }, [needsDayTotals, date, initial.mealId]);

  let suggestionsView: SuggestionsView;
  if (suggestionContext.status === "error") suggestionsView = { state: "error" };
  else if (!target) suggestionsView = { state: "no-target" };
  else if (!isCalendarDate(date)) suggestionsView = { state: "no-date" };
  else if (day?.date !== date) suggestionsView = { state: "loading" };
  else if (!day.result.ok) suggestionsView = { state: "error" };
  else {
    // Saved meals plus the foods currently in this unsaved meal.
    const remaining = remainingTargets(target, addTotals(day.result.totals, totals));
    suggestionsView = {
      state: "ready",
      remaining,
      suggestions: suggestFoodsByRole(foods, remaining, {
        allergyTags: suggestionContext.allergyTags,
        avoidedFoodIds: suggestionContext.avoidedFoodIds,
      }),
    };
  }

  function addFood(food: BuilderFood) {
    const key = nextKey.current++;
    setItems((current) => [...current, { key, food, amount: "", unit: gramsUnit }]);
    setFocusKey(key);
    setSearch("");
    setMessage(undefined);
  }

  function updateItem(key: number, changes: Partial<Pick<ItemState, "amount" | "unit">>) {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (hasUnusableItem) {
      setMessage("Fix the amounts marked in red before saving.");
      return;
    }
    setSaving(true);
    const result = await saveMealAction({
      mealId: initial.mealId,
      date,
      label,
      items: checked.flatMap(({ item, grams }) => (grams.ok ? [{ foodId: item.food.id, grams: grams.grams }] : [])),
    });
    setSaving(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    if (initial.mealId === null) {
      router.replace(`/meals/${result.mealId}`);
    } else {
      setMessage(savedMessage);
    }
    router.refresh();
  }

  return (
    <form className="mt-6 grid gap-8" onSubmit={submit}>
      <section className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">
          Meal label
          <input className={fieldClass} maxLength={maxMealLabelLength} onChange={(event) => setLabel(event.target.value)} placeholder="Breakfast, lunch, snack…" required type="text" value={label} />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Date
          <input className={fieldClass} onChange={(event) => setDate(event.target.value)} required suppressHydrationWarning type="date" value={date} />
        </label>
      </section>

      <section>
        <h2 className="text-xl font-bold">Foods</h2>
        <div className="mt-3">
          <FoodAutocomplete
            foods={foods}
            label="Add a food"
            onSelect={(food) => {
              const found = foodsById.get(food.id);
              if (found) addFood(found);
            }}
            onValueChange={setSearch}
            placeholder="Start typing a food name"
            value={search}
          />
        </div>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-700">No foods added yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {checked.map(({ item, grams }) => (
              <li className="rounded-xl border border-zinc-200 bg-white p-4" key={item.key}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-bold">{item.food.name} <span className="text-sm font-normal text-zinc-600">({stateLabels[item.food.preparation_state]})</span></p>
                  <button aria-label={`Remove ${item.food.name}`} className="text-sm font-semibold text-zinc-700 underline" onClick={() => setItems((current) => current.filter((existing) => existing.key !== item.key))} type="button">Remove</button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-sm font-semibold">
                    Amount
                    <input autoFocus={item.key === focusKey} className={fieldClass} inputMode="decimal" onChange={(event) => updateItem(item.key, { amount: event.target.value })} type="text" value={item.amount} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Unit
                    <select className={fieldClass} onChange={(event) => updateItem(item.key, { unit: event.target.value })} value={item.unit}>
                      <option value={gramsUnit}>grams</option>
                      {item.food.measures.map((measure, index) => <option key={measure.label} value={String(index)}>{measure.label} ({measure.grams} g)</option>)}
                    </select>
                  </label>
                </div>
                {grams.ok ? (
                  <p className="mt-3 text-sm text-zinc-700">
                    {item.unit !== gramsUnit && <span className="font-semibold">{grams.grams} g · </span>}
                    {describeNutrition(itemNutrition(item.food.nutrition, grams.grams))}
                  </p>
                ) : (
                  item.amount !== "" && <p className="mt-3 text-sm text-red-800">{grams.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-xl font-bold">Meal totals</h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
          <div><dt className="text-zinc-600">Calories</dt><dd className="font-bold">{Math.round(totals.kcal)} kcal</dd></div>
          <div><dt className="text-zinc-600">Protein</dt><dd className="font-bold">{totals.protein_g.toFixed(1)} g</dd></div>
          <div><dt className="text-zinc-600">Carbs</dt><dd className="font-bold">{totals.carbs_g.toFixed(1)} g</dd></div>
          <div><dt className="text-zinc-600">Fat</dt><dd className="font-bold">{totals.fat_g.toFixed(1)} g</dd></div>
          <div><dt className="text-zinc-600">Fiber</dt><dd className="font-bold">{totals.fiber_incomplete ? "Incomplete" : formatFiber(totals.fiber_g)}</dd></div>
        </dl>
        {totals.fiber_incomplete && <p className="mt-3 text-sm text-zinc-700">Some foods have no fiber listed, so the fiber total is not shown.</p>}
        {hasUnusableItem && <p className="mt-3 text-sm text-zinc-700">Foods with an unfinished amount are left out of these totals.</p>}
        <p className="mt-3 text-sm text-zinc-600">Fiber is included in carbohydrates.</p>
      </section>

      <SuggestionsPanel date={date} view={suggestionsView} />

      {message && <p aria-live="polite" className={message === savedMessage ? "text-sm text-zinc-700" : "text-sm text-red-800"}>{message}</p>}
      <button className="w-fit rounded-lg bg-lime-400 px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60" disabled={saving || items.length === 0} type="submit">
        {saving ? "Saving…" : "Save meal"}
      </button>
    </form>
  );
}
