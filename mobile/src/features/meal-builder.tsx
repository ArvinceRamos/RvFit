import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";
import { formatMeasures, stateLabels, type FoodRole } from "@/lib/food-catalog";
import { addTotals, describeItemNutrition, describeNutrition, isCalendarDate, itemNutrition, mealFormEaten, mealTotals, measureToGrams, parseAmount, validateGrams } from "@/lib/meal";
import type { SuggestionContext } from "@/lib/meal-context";
import type { BuilderFood } from "@/lib/meal-foods";
import { mapItemsToSlots, mealLabels, mealSlots, slotForRole, takenMealLabels, type MealSlotKey } from "@/lib/meal-slots";
import { allergenNotice } from "@/lib/preferences";
import { describeRemaining, formatGrams, formatKcal } from "@/lib/remaining-format";
import { remainingTargets, suggestFoodsByRole, type SuggestionRole } from "@/lib/suggestions";
import { DateStepper } from "~/components/date-stepper";
import { FoodPicker } from "~/components/food-picker";
import { Screen } from "~/components/screen";
import { Alert, Button, Card, Checkbox, Chip, Field, Row, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { clockNow } from "~/lib/clock";
import { refreshAll } from "~/lib/query";
import { fetchDayTotals, saveMeal } from "~/services/meals";
import { useTheme } from "~/theme/theme";

// The meal builder (web: src/components/meal-builder.tsx): Protein, Carbs, Fat and Fiber slots,
// other foods, recent foods, live totals and what is left today with suggested foods.

export type MealBuilderInitial = { mealId: string | null; date: string; label: string; eaten: boolean | null; items: { foodId: string; grams: number }[] };

type ItemState = { key: number; food: BuilderFood; amount: string; unit: string };
type SlotState = { search: string; item: ItemState | null };
type Slots = Record<MealSlotKey, SlotState>;

const gramsUnit = "grams";
const savedMessage = "Meal saved.";

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

// Saved items fill the slots by role. The rest become other foods.
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

function ItemCard({ item, grams, onChange, onRemove }: { item: ItemState; grams: ReturnType<typeof itemGrams>; onChange: (changes: Partial<Pick<ItemState, "amount" | "unit">>) => void; onRemove: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14, gap: 10 }}>
      <Row align="flex-start" style={{ justifyContent: "space-between" }}>
        <Txt style={{ flex: 1 }} weight="bold">
          {item.food.name} <Txt tone="muted" variant="small">({stateLabels[item.food.preparation_state]})</Txt>
        </Txt>
        <TextLink accessibilityHint={`Removes ${item.food.name}`} onPress={onRemove} tone="muted">Remove</TextLink>
      </Row>
      <Field keyboardType="decimal-pad" label="Amount" onChangeText={(amount) => onChange({ amount })} returnKeyType="done" value={item.amount} />
      <Stack gap={6}>
        <Txt variant="label">Unit</Txt>
        <Row gap={8} wrap>
          <Chip label="grams" onPress={() => onChange({ unit: gramsUnit })} selected={item.unit === gramsUnit} />
          {item.food.measures.map((measure, index) => (
            <Chip key={measure.label} label={`${measure.label} (${measure.grams} g)`} onPress={() => onChange({ unit: String(index) })} selected={item.unit === String(index)} />
          ))}
        </Row>
      </Stack>
      {grams.ok ? (
        <Txt tone="muted" variant="small">
          {item.unit !== gramsUnit ? <Txt variant="small" weight="semibold">{grams.grams} g · </Txt> : null}
          {describeItemNutrition(itemNutrition(item.food.nutrition, grams.grams))}
        </Txt>
      ) : item.amount !== "" ? (
        <Txt accessibilityRole="alert" tone="danger" variant="small">{grams.error}</Txt>
      ) : null}
    </View>
  );
}

const roleHeadings: Record<SuggestionRole, { title: string; macro: string }> = {
  protein: { title: "Protein foods", macro: "protein" },
  carb: { title: "Carb foods", macro: "carbs" },
  fat: { title: "Fat foods", macro: "fat" },
};

export function MealBuilder({ foods, initial, recentFoodIds, suggestionContext }: { foods: BuilderFood[]; initial: MealBuilderInitial; recentFoodIds: string[]; suggestionContext: SuggestionContext }) {
  const today = clockNow().today;
  const nextKey = useRef(initial.items.length);
  const foodsById = new Map(foods.map((food) => [food.id, food]));
  const [label, setLabel] = useState(initial.label);
  const [date, setDate] = useState(initial.date || today);
  // "I ate this": null until the user (or a saved meal) sets it, so the default follows the date.
  const [eatenChoice, setEatenChoice] = useState<boolean | null>(initial.eaten);
  const [slots, setSlots] = useState<Slots>(() => initialState(initial, foodsById).slots);
  const [extras, setExtras] = useState<ItemState[]>(() => initialState(initial, foodsById).extras);
  const [showExtraSearch, setShowExtraSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const slotItems = mealSlots.flatMap((slot) => slots[slot.key].item ?? []);
  const checked = [...slotItems, ...extras].map((item) => ({ item, grams: itemGrams(item) }));
  const gramsByKey = new Map(checked.map(({ item, grams }) => [item.key, grams]));
  const totals = mealTotals(checked.flatMap(({ item, grams }) => (grams.ok ? [{ food: item.food.nutrition, grams: grams.grams }] : [])));
  const hasUnusableItem = checked.some(({ grams }) => !grams.ok);
  const inMeal = new Set(checked.map(({ item }) => item.food.id));
  const recentFoods = recentFoodIds.flatMap((id) => {
    const food = foodsById.get(id);
    return food && !inMeal.has(id) ? [food] : [];
  });

  const target = suggestionContext.status === "ready" ? suggestionContext.target : null;
  const validDate = isCalendarDate(date);
  const futureDate = validDate && date > today;
  const eaten = mealFormEaten(eatenChoice, date, today);
  // Saved meals on the chosen date (not counting this one), loaded again when the date changes.
  const day = useQuery({ queryKey: ["meals", "day-totals", date, initial.mealId, reloadCount], queryFn: () => fetchDayTotals(date, initial.mealId), enabled: validDate });
  const dayResult = day.data;
  const taken = dayResult?.ok ? takenMealLabels(dayResult.usedLabels) : [];
  // An older meal keeps its free-text label as an extra option.
  const labelOptions = (mealLabels as readonly string[]).includes(initial.label) || initial.label === "" ? [...mealLabels] : [initial.label, ...mealLabels];

  function newItem(food: BuilderFood): ItemState {
    setMessage(undefined);
    return { key: nextKey.current++, food, amount: "", unit: gramsUnit };
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
  // A recent food fills its group's box when that is empty; otherwise it goes under Other foods.
  function addRecentFood(food: BuilderFood) {
    const item = newItem(food);
    const key = slotForRole(food.role);
    if (key && !slots[key].item) updateSlot(key, { item, search: "" });
    else setExtras((current) => [...current, item]);
  }
  function resetForm() {
    setLabel("");
    setEatenChoice(null);
    setSlots(emptySlots());
    setExtras([]);
    setSearch("");
    setShowExtraSearch(false);
    setReloadCount((count) => count + 1);
  }

  async function submit() {
    setMessage(undefined);
    if (!label) return setMessage("Choose a meal label.");
    if (hasUnusableItem) return setMessage("Enter a valid amount for each food, or remove it.");
    if (taken.includes(label)) return setMessage(`${label} is already used on that date. Choose another label.`);
    setSaving(true);
    const result = await saveMeal({
      mealId: initial.mealId,
      date,
      label,
      eaten,
      items: checked.flatMap(({ item, grams }) => (grams.ok ? [{ foodId: item.food.id, grams: grams.grams }] : [])),
    }).catch(() => ({ ok: false as const, error: "Your meal could not be saved. Please try again." }));
    setSaving(false);
    if (!result.ok) return setMessage(result.error);
    await refreshAll();
    if (initial.mealId === null) resetForm();
    setMessage(savedMessage);
  }

  let remainingView: React.ReactNode;
  if (suggestionContext.status === "error") remainingView = <Alert tone="danger">Suggestions are not available right now. Please try again.</Alert>;
  else if (!target) remainingView = <Txt tone="muted" variant="small">Suggestions need a saved calorie target. <TextLink onPress={() => router.push("/start")}>Set up a target</TextLink>, then save it to your account.</Txt>;
  else if (!dayResult) remainingView = <Txt tone="muted" variant="small">{"Loading today's totals…"}</Txt>;
  else if (!dayResult.ok) remainingView = <Alert tone="danger">Suggestions are not available right now. Please try again.</Alert>;
  else {
    // Saved meals plus the foods currently in this unsaved meal.
    const remaining = remainingTargets(target, addTotals(dayResult.totals, totals));
    const suggestions = suggestFoodsByRole(foods, remaining, { allergyTags: suggestionContext.allergyTags, avoidedFoodIds: suggestionContext.avoidedFoodIds });
    remainingView = (
      <Stack gap={12}>
        <Row align="flex-start" gap={10}>
          <Tile style={{ flex: 1, gap: 2 }}><Txt tone="muted" variant="small">Calories</Txt><Txt variant="h2">{describeRemaining(remaining.kcal, "kcal")}</Txt></Tile>
          <Tile style={{ flex: 1, gap: 2 }}><Txt tone="muted" variant="small">Protein</Txt><Txt variant="h2">{describeRemaining(remaining.protein_g, "g")}</Txt></Tile>
        </Row>
        <Txt tone="muted" variant="small">
          Carbs {describeRemaining(remaining.carbs_g, "g")} · Fat {describeRemaining(remaining.fat_g, "g")} · Fiber {remaining.fiber_g === null ? "Incomplete" : describeRemaining(remaining.fiber_g, "g")}
        </Txt>
        {remaining.fiber_g === null ? <Txt tone="muted" variant="small">Some foods have no fiber listed, so the remaining fiber is not shown.</Txt> : null}
        <Button onPress={() => setShowSuggestions((shown) => !shown)} size="sm" variant="secondary">{showSuggestions ? "Hide suggestions" : "Show suggestions"}</Button>
        {showSuggestions ? (
          <Stack gap={14}>
            <Txt tone="muted" variant="small">These are foods to consider, not amounts. Choose grams or a measure above.</Txt>
            {suggestions.map((group) => (
              <Stack gap={8} key={group.role}>
                <Txt weight="bold">{roleHeadings[group.role].title}</Txt>
                {group.status === "met" ? (
                  <Txt tone="muted" variant="small">{group.remaining_g === 0 ? `Your ${roleHeadings[group.role].macro} target is reached.` : `You are over your ${roleHeadings[group.role].macro} target, so none are suggested.`}</Txt>
                ) : null}
                {group.status === "none_available" ? <Txt tone="muted" variant="small">No matching suggestion is available.</Txt> : null}
                {group.status === "suggestions"
                  ? group.foods.map(({ food, macro_g_per_kcal }) => {
                      const measures = formatMeasures(food.measures);
                      return (
                        <Tile key={food.id} style={{ gap: 4 }}>
                          <Txt weight="semibold">{food.name} <Txt tone="muted" variant="small">({stateLabels[food.preparation_state]})</Txt></Txt>
                          <Txt tone="muted" variant="small">{(macro_g_per_kcal * 100).toFixed(1)} g {roleHeadings[group.role].macro} per 100 kcal</Txt>
                          <Txt tone="muted" variant="small">Per 100 g: {describeNutrition(itemNutrition(food.nutrition, 100))}</Txt>
                          <Txt tone="muted" variant="small">{measures ? `Common measures: ${measures}` : "No common measures listed. Use grams."}</Txt>
                        </Tile>
                      );
                    })
                  : null}
              </Stack>
            ))}
            <Txt tone="muted" variant="small">
              Suggestions skip foods that match the allergies and avoided foods saved in your <TextLink onPress={() => router.push("/preferences")}>preferences</TextLink>. {allergenNotice}
            </Txt>
          </Stack>
        ) : null}
      </Stack>
    );
  }

  const footer = (
    <Stack gap={10}>
      {message === savedMessage ? (
        <Alert tone="success">
          <Txt variant="small">
            {savedMessage} It is on your Food page for that day. <TextLink onPress={() => router.navigate("/food")}>View my meals</TextLink> · <TextLink onPress={() => router.navigate("/today")}>Today</TextLink>
          </Txt>
        </Alert>
      ) : message ? (
        <Alert tone="danger">{message}</Alert>
      ) : null}
      <Row gap={12}>
        <Stack gap={0} style={{ flex: 1 }}>
          <Txt variant="label">{formatKcal(totals.kcal)}</Txt>
          <Txt tone="muted" variant="xs">{formatGrams(totals.protein_g)} protein</Txt>
        </Stack>
        <Button disabled={checked.length === 0} loading={saving} loadingText="Saving…" onPress={submit} style={{ flex: 2 }}>Save meal</Button>
      </Row>
    </Stack>
  );

  return (
    <Screen footer={footer}>
      <Stack gap={8}>
        <Txt variant="label">Meal label</Txt>
        <Row gap={8} wrap>
          {labelOptions.map((option) => {
            const isTaken = taken.includes(option);
            return <Chip disabled={isTaken} key={option} label={isTaken ? `${option} (taken)` : option} onPress={() => { setLabel(option); setMessage(undefined); }} selected={label === option} />;
          })}
        </Row>
      </Stack>
      <DateStepper label="Date" onChange={setDate} today={today} value={date} />
      <Stack gap={4}>
        {futureDate ? (
          <Txt tone="muted" variant="small">A future meal is saved as planned. Tick it on the Food page once you eat it.</Txt>
        ) : (
          <>
            <Checkbox checked={eaten} label="I ate this" onChange={setEatenChoice} />
            <Txt tone="muted" variant="xs">{"Only meals ticked as eaten count toward the day's totals."}</Txt>
          </>
        )}
      </Stack>

      <Stack gap={12}>
        <Txt variant="section">Foods</Txt>
        <Txt tone="muted" variant="small">Fill any of these. Leave the rest empty. A meal needs at least one food.</Txt>
        {recentFoods.length > 0 ? (
          <Stack gap={8}>
            <Txt variant="label">Recent foods</Txt>
            <Row gap={8} wrap>
              {recentFoods.map((food) => <Chip accessibilityHint={`Adds ${food.name}`} key={food.id} label={`+ ${food.name}`} onPress={() => addRecentFood(food)} />)}
            </Row>
          </Stack>
        ) : null}
        {mealSlots.map((slot) => {
          const state = slots[slot.key];
          const roles = slot.roles as readonly FoodRole[];
          return state.item ? (
            <Stack gap={6} key={slot.key}>
              <Txt variant="label">{slot.label}</Txt>
              <ItemCard grams={gramsByKey.get(state.item.key)!} item={state.item} onChange={(changes) => updateItem(state.item!.key, changes)} onRemove={() => updateSlot(slot.key, { item: null, search: "" })} />
            </Stack>
          ) : (
            <FoodPicker
              foods={foods.filter((food) => roles.includes(food.role))}
              key={slot.key}
              label={slot.label}
              onSelect={(food) => updateSlot(slot.key, { item: newItem(food), search: "" })}
              onSelectOther={(food) => {
                setExtras((current) => [...current, newItem(food)]);
                updateSlot(slot.key, { search: "" });
              }}
              onValueChange={(value) => updateSlot(slot.key, { search: value })}
              otherFoods={foods.filter((food) => !roles.includes(food.role))}
              otherNote={`Nothing under ${slot.label} matches. These are from all foods and go under Other foods.`}
              placeholder="Start typing a food name (optional)"
              value={state.search}
            />
          );
        })}
        {extras.length > 0 ? (
          <Stack gap={8}>
            <Txt variant="label">Other foods</Txt>
            {extras.map((item) => (
              <ItemCard grams={gramsByKey.get(item.key)!} item={item} key={item.key} onChange={(changes) => updateItem(item.key, changes)} onRemove={() => setExtras((current) => current.filter((existing) => existing.key !== item.key))} />
            ))}
          </Stack>
        ) : null}
        {showExtraSearch ? (
          <FoodPicker
            foods={foods}
            label="Add another food"
            onSelect={(food) => {
              setExtras((current) => [...current, newItem(food)]);
              setSearch("");
              setShowExtraSearch(false);
            }}
            onValueChange={setSearch}
            placeholder="Start typing a food name"
            value={search}
          />
        ) : (
          <Button icon="plus" onPress={() => setShowExtraSearch(true)} size="sm" variant="secondary">Add another food</Button>
        )}
      </Stack>

      <Card>
        <Stack gap={10}>
          <Txt variant="section">Meal totals</Txt>
          <Row align="flex-start" gap={10}>
            <Stack gap={0} style={{ flex: 1 }}><Txt tone="muted" variant="small">Calories</Txt><Txt style={{ fontSize: 22 }} weight="bold">{formatKcal(totals.kcal)}</Txt></Stack>
            <Stack gap={0} style={{ flex: 1 }}><Txt tone="muted" variant="small">Protein</Txt><Txt style={{ fontSize: 22 }} weight="bold">{formatGrams(totals.protein_g)}</Txt></Stack>
          </Row>
          <Txt tone="muted" variant="small">Carbs {formatGrams(totals.carbs_g)} · Fat {formatGrams(totals.fat_g)} · Fiber {totals.fiber_g === null ? "Incomplete" : formatGrams(totals.fiber_g)}</Txt>
          {totals.fiber_incomplete ? <Txt tone="muted" variant="small">Some foods have no fiber listed, so the fiber total is not shown.</Txt> : null}
          {hasUnusableItem ? <Txt tone="muted" variant="small">Foods with an unfinished amount are left out of these totals.</Txt> : null}
          <Txt tone="muted" variant="small">Fiber is included in carbohydrates.</Txt>
        </Stack>
      </Card>

      <Card>
        <Stack gap={10}>
          <Txt variant="section">Remaining today</Txt>
          <Txt tone="muted" variant="small">Based on your saved target, meals saved on this date, and the foods in this meal.</Txt>
          {remainingView}
        </Stack>
      </Card>
    </Screen>
  );
}
