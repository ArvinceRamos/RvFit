import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { calculationConfig, type PortionClass } from "@/lib/calc/config";
import { isCalendarDate, type MealTotals } from "@/lib/meal";
import { loadMealContext } from "@/lib/meal-context";
import type { BuilderFood } from "@/lib/meal-foods";
import { buildMealPlan, plannerGroups, type LoggedDay, type PlannedDay, type PlannedItem, type PlannerGroup, type Rotation } from "@/lib/meal-planner";
import { formatGrams, formatKcal } from "@/lib/remaining-format";
import { isExcluded, suggestFoodsByRole, type DailyTargets, type Exclusions } from "@/lib/suggestions";
import { DateStepper } from "~/components/date-stepper";
import { FoodPicker } from "~/components/food-picker";
import { Icon } from "~/components/icon";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Alert, Button, Card, Chip, Divider, Row, Segmented, Stack, TextLink, Txt } from "~/components/ui";
import { confirmAction } from "~/lib/actions";
import { clockNow } from "~/lib/clock";
import { formatDay } from "~/lib/format";
import { refreshAll } from "~/lib/query";
import { sharedClient } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";
import { fetchPlanDays, saveMealPlan } from "~/services/meals";
import { useTheme } from "~/theme/theme";

const limits = calculationConfig.meal_planner;
const mealCounts = Array.from({ length: limits.meals_per_day.max - limits.meals_per_day.min + 1 }, (_, index) => limits.meals_per_day.min + index);
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

function describeAmount(item: PlannedItem<BuilderFood>): string {
  if (item.units === null || !item.food.portion_class) return `${item.grams} g`;
  const [one, many] = unitNames[item.food.portion_class] ?? ["unit", "units"];
  return `${item.units} ${item.units === 1 ? one : many} (${item.grams} g)`;
}

function describeTotals(totals: MealTotals): string {
  return `${formatKcal(totals.kcal)} · Protein ${formatGrams(totals.protein_g)} · Carbs ${formatGrams(totals.carbs_g)} · Fat ${formatGrams(totals.fat_g)}`;
}

async function load() {
  const { foods, suggestionContext } = await loadMealContext(sharedClient);
  return { ok: true as const, foods, context: suggestionContext };
}

// Plan meals (web: /meals/plan).
export default function MealPlan() {
  const screen = useScreenData(["meals", "planner"], load);
  if (screen.loading) return <LoadingView label="Loading foods…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "Your foods could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { foods, context } = screen.data;

  const intro = <Txt tone="muted" variant="small">Pick the foods you have. The plan fits your saved target as closely as these foods allow. It is a starting estimate, not a promise.</Txt>;
  if (context.status === "error") {
    // Without saved allergies and avoided foods, show nothing rather than unfiltered foods.
    return <Screen>{intro}<Alert tone="danger">Your preferences could not be loaded. Please try again.</Alert></Screen>;
  }
  if (!context.target) {
    return (
      <Screen>
        {intro}
        <Txt tone="muted" variant="small">Meal plans need a saved calorie target. <TextLink onPress={() => router.push("/start")}>Set up a target</TextLink>, then save it to your account.</Txt>
      </Screen>
    );
  }
  const exclusions = { allergyTags: context.allergyTags, avoidedFoodIds: context.avoidedFoodIds };
  // Excluded foods are never offered, so they cannot be picked.
  const plannerFoods = foods.filter((food) => (plannerGroups as readonly string[]).includes(food.role) && !isExcluded(food, exclusions));
  return <PlannerForm exclusions={exclusions} foods={plannerFoods} intro={intro} target={context.target} />;
}

function PlannerForm({ foods, target, exclusions, intro }: { foods: BuilderFood[]; target: DailyTargets; exclusions: Exclusions; intro: React.ReactNode }) {
  const { colors } = useTheme();
  const today = clockNow().today;
  const [length, setLength] = useState<"day" | "week">("day");
  const [startDate, setStartDate] = useState(today);
  const [mealsPerDay, setMealsPerDay] = useState<number>(limits.meals_per_day.default);
  const [rotations, setRotations] = useState<Record<PlannerGroup, Rotation>>({ protein: "mix", carb: "mix", fat: "mix" });
  const [picks, setPicks] = useState<Picks>({ protein: [], carb: [], fat: [] });
  const [searches, setSearches] = useState<Record<PlannerGroup, string>>({ protein: "", carb: "", fat: "" });
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // Common foods for one-tap picks: the top of the suggestion ranking for the full day target.
  const common = new Map(suggestFoodsByRole(foods, target, exclusions).map((entry) => [entry.role, entry.foods.map((ranked) => ranked.food)]));
  const days = length === "day" ? 1 : limits.max_days;
  const pickedCount = plannerGroups.reduce((sum, group) => sum + picks[group].length, 0);
  const plannedMeals = preview?.days.flatMap((day) => day.meals.map((meal) => ({ day, meal }))) ?? [];

  // Any change to the inputs makes the preview out of date.
  function changed() {
    setPreview(undefined);
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
    if (!isCalendarDate(startDate)) return setMessage("Choose a valid start date.");
    setBusy(true);
    const loaded = await fetchPlanDays(startDate, days).catch(() => ({ ok: false }) as const);
    setBusy(false);
    if (!loaded.ok) return setMessage("Your logged meals could not be loaded. Please try again.");
    const result = buildMealPlan({ startDate, days, mealsPerDay, targets: target, foods: picks, rotations, exclusions, logged: loaded.logged });
    if (!result.ok) return setMessage(result.error);
    setPreview({ days: result.data, logged: loaded.logged });
  }

  async function save() {
    const count = plannedMeals.length;
    if (!(await confirmAction({ title: `Save ${count} ${count === 1 ? "meal" : "meals"} to your log?`, confirmLabel: "Yes", destructive: false }))) return;
    setBusy(true);
    setSaveError(undefined);
    const result = await saveMealPlan({
      meals: plannedMeals.map(({ day, meal }) => ({ date: day.date, label: meal.label, items: meal.items.map((item) => ({ foodId: item.food.id, grams: item.grams })) })),
    }).catch(() => ({ ok: false as const, error: "Your plan could not be saved. Please try again." }));
    setBusy(false);
    if (!result.ok) return setSaveError(result.error);
    // Go back straight away; every screen reloads its data in the background.
    void refreshAll();
    router.dismissTo({ pathname: "/food", params: { saved: "plan" } });
  }

  const footer = preview ? (
    <Stack gap={8}>
      {saveError ? <Alert tone="danger">{saveError}</Alert> : null}
      {plannedMeals.length === 0 ? (
        <Txt tone="muted" variant="small">Nothing to save. No meals were planned.</Txt>
      ) : (
        <Button full loading={busy} loadingText="Saving…" onPress={save}>Save as meals</Button>
      )}
    </Stack>
  ) : (
    <Stack gap={8}>
      {message ? <Alert tone="danger">{message}</Alert> : null}
      {pickedCount === 0 ? <Txt tone="muted" variant="small">Pick at least one food to preview a plan.</Txt> : null}
      <Button disabled={pickedCount === 0} full loading={busy} loadingText="Planning…" onPress={makePreview}>Preview plan</Button>
    </Stack>
  );

  return (
    // Two steps on a phone: pick, then review. The preview replaces the long pick form (a new scroll
    // view, so it opens at the top), and "Change picks" goes back with every pick kept.
    <Screen footer={footer} key={preview ? "preview" : "picks"}>
      {intro}
      {preview ? (
        <Stack gap={12}>
          <Row style={{ justifyContent: "space-between" }}>
            <Txt variant="section">Preview</Txt>
            <Button icon="chevron-left" onPress={changed} size="sm" variant="secondary">Change picks</Button>
          </Row>
          <Txt tone="muted" variant="small">
            {plannerGroups.flatMap((group) => picks[group].map((food) => food.name)).join(" · ")}
          </Txt>
          {preview.days.map((day) => <PlanDayCard day={day} key={day.date} logged={preview.logged[day.date]} />)}
        </Stack>
      ) : (
        <>
          <Card>
            <Stack gap={14}>
              <Txt variant="section">Plan</Txt>
              <Stack gap={6}>
                <Txt variant="label">Length</Txt>
                <Segmented label="Length" onChange={(value) => { setLength(value); changed(); }} options={[{ value: "day", label: "Day" }, { value: "week", label: "Week" }]} value={length} />
              </Stack>
              <DateStepper label={length === "day" ? "Date" : "Start date (7 days)"} onChange={(value) => { setStartDate(value); changed(); }} today={today} value={startDate} />
              <Stack gap={6}>
                <Txt variant="label">Meals per day</Txt>
                <Row gap={8} wrap>
                  {mealCounts.map((count) => <Chip key={count} label={String(count)} onPress={() => { setMealsPerDay(count); changed(); }} selected={mealsPerDay === count} />)}
                </Row>
              </Stack>
              {length === "week" ? (
                <Stack gap={12}>
                  <Txt variant="label">Week rotation</Txt>
                  {plannerGroups.map((group) => (
                    <Stack gap={6} key={group}>
                      <Txt variant="small" weight="semibold">{groupLabels[group]}</Txt>
                      <Segmented
                        label={`${groupLabels[group]} rotation`}
                        onChange={(value) => { setRotations((current) => ({ ...current, [group]: value })); changed(); }}
                        options={rotationOptions.map((option) => ({ value: option.value, label: option.label }))}
                        value={rotations[group]}
                      />
                      <Txt tone="muted" variant="xs">{rotationOptions.find((option) => option.value === rotations[group])?.hint}</Txt>
                    </Stack>
                  ))}
                </Stack>
              ) : (
                <Txt tone="muted" variant="small">A day plan spreads all picked foods over its meals.</Txt>
              )}
            </Stack>
          </Card>
    
          <Card>
            <Stack gap={16}>
              <Stack gap={4}>
                <Txt variant="section">Foods you have</Txt>
                <Txt tone="muted" variant="small">Up to {limits.max_foods_per_group} per group. Each meal uses one protein, one carb, and one fat food, plus a second one when a portion is full. Portions stay within normal sizes.</Txt>
              </Stack>
              {plannerGroups.map((group) => {
                const picked = picks[group];
                const pickedIds = new Set(picked.map((food) => food.id));
                const full = picked.length >= limits.max_foods_per_group;
                const quick = (common.get(group) ?? []).filter((food) => !pickedIds.has(food.id));
                return (
                  <Stack gap={8} key={group}>
                    {full ? (
                      <Txt variant="label">{groupLabels[group]} <Txt tone="muted" variant="small">(the most for this group)</Txt></Txt>
                    ) : (
                      <FoodPicker
                        foods={foods.filter((food) => food.role === group && !pickedIds.has(food.id))}
                        label={groupLabels[group]}
                        onSelect={(food) => addPick(group, food)}
                        onValueChange={(value) => setSearches((current) => ({ ...current, [group]: value }))}
                        placeholder="Start typing a food name"
                        value={searches[group]}
                      />
                    )}
                    {picked.length > 0 ? (
                      <Row gap={8} wrap>
                        {picked.map((food) => (
                          <View key={food.id} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.selectedEdge, backgroundColor: colors.selected, paddingLeft: 12, paddingRight: 4, minHeight: 38 }}>
                            <Txt variant="small">{food.name}</Txt>
                            <Pressable accessibilityLabel={`Remove ${food.name}`} accessibilityRole="button" hitSlop={6} onPress={() => removePick(group, food.id)} style={{ width: 30, height: 30, alignItems: "center", justifyContent: "center" }}>
                              <Icon color={colors.muted} name="close" size={14} />
                            </Pressable>
                          </View>
                        ))}
                      </Row>
                    ) : null}
                    {picked.some((food) => food.portion_class === "powder") ? <Txt tone="muted" variant="xs">Whey is planned as a separate shake, in whole scoops, only when meals leave protein short.</Txt> : null}
                    {!full && quick.length > 0 ? (
                      <Row gap={6} wrap>
                        <Txt tone="muted" variant="xs">Common:</Txt>
                        {quick.map((food) => <Chip key={food.id} label={`+ ${food.name}`} onPress={() => addPick(group, food)} />)}
                      </Row>
                    ) : null}
                  </Stack>
                );
              })}
            </Stack>
          </Card>
        </>
      )}
    </Screen>
  );
}

function PlanDayCard({ day, logged }: { day: PlannedDay<BuilderFood>; logged: LoggedDay | undefined }) {
  const rows = [
    { name: "Protein", planned: day.totals.protein_g, budget: day.budget.protein_g },
    { name: "Carbs", planned: day.totals.carbs_g, budget: day.budget.carbs_g },
    { name: "Fat", planned: day.totals.fat_g, budget: day.budget.fat_g },
  ];
  return (
    <Card compact>
      <Stack gap={12}>
        <Stack gap={2}>
          <Txt variant="h2">{formatDay(day.date)}</Txt>
          {logged && day.status === "planned" ? <Txt tone="muted" variant="small">Planned for what is left after {logged.labels.length} logged {logged.labels.length === 1 ? "meal" : "meals"}.</Txt> : null}
        </Stack>
        {day.status === "met" ? <Txt variant="small" weight="semibold">Already met. No meals planned.</Txt> : null}
        {day.status === "meals_logged" ? day.notes.map((note) => <Txt key={note} variant="small" weight="semibold">{note}</Txt>) : null}
        {day.meals.map((meal) => (
          <Stack gap={4} key={meal.label}>
            <Txt weight="semibold">{meal.label}{meal.kind === "shake" ? <Txt tone="muted"> · Shake</Txt> : null}</Txt>
            {meal.items.map((item) => (
              <Row key={item.food.id} style={{ justifyContent: "space-between" }}>
                <Txt style={{ flex: 1 }} variant="small">{item.food.name}</Txt>
                <Txt variant="small" weight="semibold">{describeAmount(item)}</Txt>
              </Row>
            ))}
            <Txt tone="muted" variant="xs">{describeTotals(meal.totals)}</Txt>
          </Stack>
        ))}
        {day.status === "planned" ? (
          <Stack gap={6}>
            <Divider />
            <Txt variant="small" weight="semibold">Day plan: {formatKcal(day.totals.kcal)}</Txt>
            {rows.map((row) => (
              <Row key={row.name} style={{ justifyContent: "space-between" }}>
                <Txt tone="muted" variant="small">{row.name}</Txt>
                <Txt variant="small">{Math.round(row.planned)} / {formatGrams(row.budget)}</Txt>
              </Row>
            ))}
            <Row style={{ justifyContent: "space-between" }}>
              <Txt tone="muted" variant="small">Fiber</Txt>
              <Txt variant="small">{day.totals.fiber_g === null ? "Incomplete" : formatGrams(day.totals.fiber_g)}</Txt>
            </Row>
            {day.notes.map((note) => <Txt key={note} tone="muted" variant="small">{note}</Txt>)}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}
