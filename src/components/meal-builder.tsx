"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadDayTotalsAction, saveMealAction, type DayTotalsResult } from "@/app/meals/actions";
import { FoodAutocomplete } from "@/components/food-autocomplete";
import { SuggestionsPanel, type SuggestionsView } from "@/components/suggestions-panel";
import { formatFiber, stateLabels, type FoodRole } from "@/lib/food-catalog";
import {
  addTotals,
  describeNutrition,
  isCalendarDate,
  itemNutrition,
  mealTotals,
  measureToGrams,
  parseAmount,
  validateGrams,
} from "@/lib/meal";
import type { SuggestionContext } from "@/lib/meal-context";
import type { BuilderFood } from "@/lib/meal-foods";
import { mapItemsToSlots, mealLabels, mealSlots, takenMealLabels, type MealSlotKey } from "@/lib/meal-slots";
import { remainingTargets, suggestFoodsByRole } from "@/lib/suggestions";

export type MealBuilderInitial = {
  mealId: string | null;
  date: string;
  label: string;
  items: { foodId: string; grams: number }[];
};

type ItemState = { key: number; food: BuilderFood; amount: string; unit: string };
type SlotState = { search: string; item: ItemState | null };
type Slots = Record<MealSlotKey, SlotState>;

const gramsUnit = "grams";
const savedMessage = "Meal saved.";
const fieldClass = "rounded-lg border border-edge bg-field px-3 py-2 text-base font-normal";

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function emptySlots(): Slots {
  return { protein: { search: "", item: null }, carb: { search: "", item: null }, fat: { search: "", item: null }, fiber: { search: "", item: null } };
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

// Saved items fill the slots by role. The rest become extra foods.
function initialState(initial: MealBuilderInitial, foodsById: Map<string, BuilderFood>): { slots: Slots; extras: ItemState[] } {
  const items = initial.items.flatMap((item, index) => {
    const food = foodsById.get(item.foodId);
    return food ? [{ role: food.role, item: { key: index, food, amount: String(item.grams), unit: gramsUnit } }] : [];
  });
  const mapped = mapItemsToSlots(items);
  const slots = emptySlots();
  for (const slot of mealSlots) slots[slot.key].item = mapped.slots[slot.key]?.item ?? null;
  return { slots, extras: mapped.extras.map((entry) => entry.item) };
}

function ItemCard({ item, grams, focus, onChange, onRemove }: {
  item: ItemState;
  grams: ReturnType<typeof itemGrams>;
  focus: boolean;
  onChange: (changes: Partial<Pick<ItemState, "amount" | "unit">>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold">{item.food.name} <span className="text-sm font-normal text-muted">({stateLabels[item.food.preparation_state]})</span></p>
        <button aria-label={`Remove ${item.food.name}`} className="text-sm font-semibold text-muted underline" onClick={onRemove} type="button">Remove</button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="grid min-w-0 gap-1 text-sm font-semibold">
          Amount
          <input autoFocus={focus} className={`${fieldClass} w-full min-w-0`} inputMode="decimal" onChange={(event) => onChange({ amount: event.target.value })} type="text" value={item.amount} />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-semibold">
          Unit
          <select className={`${fieldClass} w-full min-w-0`} onChange={(event) => onChange({ unit: event.target.value })} value={item.unit}>
            <option value={gramsUnit}>grams</option>
            {item.food.measures.map((measure, index) => <option key={measure.label} value={String(index)}>{measure.label} ({measure.grams} g)</option>)}
          </select>
        </label>
      </div>
      {grams.ok ? (
        <p className="mt-3 text-sm text-muted">
          {item.unit !== gramsUnit && <span className="font-semibold">{grams.grams} g · </span>}
          {describeNutrition(itemNutrition(item.food.nutrition, grams.grams))}
        </p>
      ) : (
        item.amount !== "" && <p className="mt-3 text-sm text-danger">{grams.error}</p>
      )}
    </div>
  );
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
  const [slots, setSlots] = useState<Slots>(() => initialState(initial, foodsById).slots);
  const [extras, setExtras] = useState<ItemState[]>(() => initialState(initial, foodsById).extras);
  const [showExtraSearch, setShowExtraSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [focusKey, setFocusKey] = useState<number>();
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  // Bumped after a new meal is saved, so the day totals load again.
  const [reloadCount, setReloadCount] = useState(0);

  const slotItems = mealSlots.flatMap((slot) => slots[slot.key].item ?? []);
  const checked = [...slotItems, ...extras].map((item) => ({ item, grams: itemGrams(item) }));
  const gramsByKey = new Map(checked.map(({ item, grams }) => [item.key, grams]));
  const usable = checked.flatMap(({ item, grams }) => (grams.ok ? [{ food: item.food.nutrition, grams: grams.grams }] : []));
  const totals = mealTotals(usable);
  const hasUnusableItem = checked.some(({ grams }) => !grams.ok);

  // Saved meals on the chosen date (not counting this one), fetched again when the date changes.
  const target = suggestionContext.status === "ready" ? suggestionContext.target : null;
  const validDate = isCalendarDate(date);
  const [day, setDay] = useState<{ date: string; result: DayTotalsResult }>();
  useEffect(() => {
    if (!validDate) return;
    let cancelled = false;
    loadDayTotalsAction(date, initial.mealId)
      .then((result) => { if (!cancelled) setDay({ date, result }); })
      .catch(() => { if (!cancelled) setDay({ date, result: { ok: false } }); });
    return () => { cancelled = true; };
  }, [validDate, date, initial.mealId, reloadCount]);

  const dayResult = day?.date === date ? day.result : undefined;
  const taken = dayResult?.ok ? takenMealLabels(dayResult.usedLabels) : [];
  // An older meal keeps its free-text label as an extra option.
  const labelOptions = (mealLabels as readonly string[]).includes(initial.label) || initial.label === ""
    ? [...mealLabels]
    : [initial.label, ...mealLabels];

  let suggestionsView: SuggestionsView;
  if (suggestionContext.status === "error") suggestionsView = { state: "error" };
  else if (!target) suggestionsView = { state: "no-target" };
  else if (!validDate) suggestionsView = { state: "no-date" };
  else if (!dayResult) suggestionsView = { state: "loading" };
  else if (!dayResult.ok) suggestionsView = { state: "error" };
  else {
    // Saved meals plus the foods currently in this unsaved meal.
    const remaining = remainingTargets(target, addTotals(dayResult.totals, totals));
    suggestionsView = {
      state: "ready",
      remaining,
      suggestions: suggestFoodsByRole(foods, remaining, {
        allergyTags: suggestionContext.allergyTags,
        avoidedFoodIds: suggestionContext.avoidedFoodIds,
      }),
    };
  }

  function newItem(food: BuilderFood): ItemState {
    const key = nextKey.current++;
    setFocusKey(key);
    setMessage(undefined);
    return { key, food, amount: "", unit: gramsUnit };
  }

  function updateSlot(key: MealSlotKey, changes: Partial<SlotState>) {
    setSlots((current) => ({ ...current, [key]: { ...current[key], ...changes } }));
  }

  function updateItem(itemKey: number, changes: Partial<Pick<ItemState, "amount" | "unit">>) {
    setSlots((current) => {
      const next = { ...current };
      for (const slot of mealSlots) {
        const item = next[slot.key].item;
        if (item?.key === itemKey) next[slot.key] = { ...next[slot.key], item: { ...item, ...changes } };
      }
      return next;
    });
    setExtras((current) => current.map((item) => (item.key === itemKey ? { ...item, ...changes } : item)));
  }

  function resetForm() {
    setLabel("");
    setSlots(emptySlots());
    setExtras([]);
    setSearch("");
    setShowExtraSearch(false);
    setFocusKey(undefined);
    setDay(undefined);
    setReloadCount((count) => count + 1);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    if (hasUnusableItem) {
      setMessage("Enter a valid amount for each food, or remove it.");
      return;
    }
    if (taken.includes(label)) {
      setMessage(`${label} is already used on that date. Choose another label.`);
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
      resetForm();
    } else {
      router.refresh();
    }
    setMessage(savedMessage);
  }

  return (
    <form className="mt-6 grid gap-8 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-10" onSubmit={submit}>
      <div className="grid gap-8 lg:col-start-1 lg:row-start-1">
        <section className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">
            Meal label
            <select className={fieldClass} onChange={(event) => { setLabel(event.target.value); setMessage(undefined); }} required value={label}>
              <option value="">Choose a label</option>
              {labelOptions.map((option) => {
                const isTaken = taken.includes(option);
                return <option disabled={isTaken} key={option} value={option}>{isTaken ? `${option} (taken)` : option}</option>;
              })}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Date
            <input className={fieldClass} onChange={(event) => setDate(event.target.value)} required suppressHydrationWarning type="date" value={date} />
          </label>
        </section>

        <section>
          <h2 className="text-xl font-bold">Foods</h2>
          <p className="mt-1 text-sm text-muted">Fill any of these. Leave the rest empty. A meal needs at least one food.</p>
          <div className="mt-4 grid gap-5">
            {mealSlots.map((slot) => {
              const state = slots[slot.key];
              const roles = slot.roles as readonly FoodRole[];
              return (
                <div key={slot.key}>
                  {state.item ? (
                    <>
                      <p className="mb-1 text-sm font-semibold">{slot.label}</p>
                      <ItemCard
                        focus={state.item.key === focusKey}
                        grams={gramsByKey.get(state.item.key)!}
                        item={state.item}
                        onChange={(changes) => updateItem(state.item!.key, changes)}
                        onRemove={() => updateSlot(slot.key, { item: null, search: "" })}
                      />
                    </>
                  ) : (
                    <FoodAutocomplete
                      foods={foods.filter((food) => roles.includes(food.role))}
                      label={slot.label}
                      onSelect={(food) => {
                        const found = foodsById.get(food.id);
                        if (found) updateSlot(slot.key, { item: newItem(found), search: "" });
                      }}
                      onValueChange={(value) => updateSlot(slot.key, { search: value })}
                      placeholder="Start typing a food name (optional)"
                      value={state.search}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {extras.length > 0 && (
            <div className="mt-5 grid gap-3">
              <p className="text-sm font-semibold">Other foods</p>
              {extras.map((item) => (
                <ItemCard
                  focus={item.key === focusKey}
                  grams={gramsByKey.get(item.key)!}
                  item={item}
                  key={item.key}
                  onChange={(changes) => updateItem(item.key, changes)}
                  onRemove={() => setExtras((current) => current.filter((existing) => existing.key !== item.key))}
                />
              ))}
            </div>
          )}

          <div className="mt-5">
            {showExtraSearch ? (
              <FoodAutocomplete
                foods={foods}
                label="Add another food"
                onSelect={(food) => {
                  const found = foodsById.get(food.id);
                  if (!found) return;
                  const item = newItem(found);
                  setExtras((current) => [...current, item]);
                  setSearch("");
                  setShowExtraSearch(false);
                }}
                onValueChange={setSearch}
                placeholder="Start typing a food name"
                value={search}
              />
            ) : (
              <button className="rounded-lg border border-edge bg-field px-4 py-2 text-sm font-semibold" onClick={() => setShowExtraSearch(true)} type="button">
                Add another food
              </button>
            )}
          </div>
        </section>
      </div>

      <aside className="grid gap-6 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
        <section className="rounded-xl border border-line bg-card p-5">
          <h2 className="text-xl font-bold">Meal totals</h2>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5 lg:grid-cols-3">
            <div><dt className="text-muted">Calories</dt><dd className="font-bold">{Math.round(totals.kcal)} kcal</dd></div>
            <div><dt className="text-muted">Protein</dt><dd className="font-bold">{totals.protein_g.toFixed(1)} g</dd></div>
            <div><dt className="text-muted">Carbs</dt><dd className="font-bold">{totals.carbs_g.toFixed(1)} g</dd></div>
            <div><dt className="text-muted">Fat</dt><dd className="font-bold">{totals.fat_g.toFixed(1)} g</dd></div>
            <div><dt className="text-muted">Fiber</dt><dd className="font-bold">{totals.fiber_incomplete ? "Incomplete" : formatFiber(totals.fiber_g)}</dd></div>
          </dl>
          {totals.fiber_incomplete && <p className="mt-3 text-sm text-muted">Some foods have no fiber listed, so the fiber total is not shown.</p>}
          {hasUnusableItem && <p className="mt-3 text-sm text-muted">Foods with an unfinished amount are left out of these totals.</p>}
          <p className="mt-3 text-sm text-muted">Fiber is included in carbohydrates.</p>
        </section>

        <SuggestionsPanel date={date} view={suggestionsView} />
      </aside>

      <div className="grid gap-3 lg:col-start-1 lg:row-start-2 lg:self-start">
        {message && <p aria-live="polite" className={message === savedMessage ? "text-sm text-muted" : "text-sm text-danger"}>{message}</p>}
        <button className="w-fit rounded-lg bg-accent px-4 py-3 font-bold text-on-accent disabled:cursor-not-allowed disabled:opacity-60" disabled={saving || checked.length === 0} type="submit">
          {saving ? "Saving…" : "Save meal"}
        </button>
      </div>
    </form>
  );
}
