import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { loadDayTotals, loadMealDays } from "@/lib/meal-days-data";
import { dayPrepList, describeMealDay, mealDaysWindow, type MealDay, type MealDayMeal, type MealDayView } from "@/lib/meal-days";
import { formatGrams, formatKcal } from "@/lib/remaining-format";
import { addDays } from "@/lib/week";
import { Icon } from "~/components/icon";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Alert, Button, Card, Row, Segmented, Stack, TextLink, Txt } from "~/components/ui";
import { DayTotals } from "~/features/day-totals";
import { MealEatenToggle } from "~/features/meal-eaten-toggle";
import { confirmAction, useAction } from "~/lib/actions";
import { clockNow } from "~/lib/clock";
import { formatDay } from "~/lib/format";
import { keys } from "~/lib/query";
import { sharedClient, supabase } from "~/lib/supabase";
import { useNoticeParam } from "~/lib/use-notice-param";
import { useScreenData } from "~/lib/use-screen-data";
import { copyMealDay, copyMealToDate, deleteMeal } from "~/services/meals";
import { useTheme } from "~/theme/theme";

const tabs: { value: MealDayView; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Plan" },
  { value: "past", label: "History" },
];

const emptyText: Record<MealDayView, string> = {
  today: "No meals saved today yet.",
  upcoming: `No meals planned for the next ${mealDaysWindow} days.`,
  past: `No meals saved in the last ${mealDaysWindow} days.`,
};

async function loadFood(view: MealDayView, today: string) {
  const [{ data: targetRows, error: targetError }, result, todayTotals] = await Promise.all([
    supabase.from("calorie_targets").select("target_kcal, protein_g, carbs_g, fat_g, fiber_g").order("created_at", { ascending: false }).limit(1),
    loadMealDays(sharedClient, view, today),
    loadDayTotals(sharedClient, today, null),
  ]);
  if (targetError || !result.ok) return { ok: false as const, error: "Your meals could not be loaded. Please try again." };
  const row = targetRows?.[0];
  const target = row ? { kcal: Number(row.target_kcal), protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) } : null;
  return { ok: true as const, target, days: result.days, yesterdayToCopy: result.yesterdayToCopy, todayTotals };
}

// Food (web: /meals): today's totals, actions, and one card per day for Today, Plan and History.
export default function Food() {
  const saved = useNoticeParam("saved");
  const [view, setView] = useState<MealDayView>("today");
  const { today } = clockNow();
  const screen = useScreenData([...keys.meals, view, today], () => loadFood(view, today));

  if (screen.loading && !screen.data) return <LoadingView label="Loading meals…" />;
  if (screen.error && screen.offline) return <ErrorView message="" offline onRetry={screen.retry} />;
  const data = screen.data;

  return (
    <Screen onRefresh={screen.refresh} refreshing={screen.refreshing} topInset>
      <Txt variant="title">Food</Txt>
      {saved === "plan" ? <Alert tone="success">{"Your plan is saved. Tick each planned meal when you eat it; only ticked meals count toward the day's totals."}</Alert> : null}

      <Card>
        <Stack gap={12}>
          <Txt variant="section">Today</Txt>
          {!data ? null : data.target && !data.todayTotals.ok ? (
            <Alert tone="danger">{"Today's totals are not available right now. Please try again."}</Alert>
          ) : (
            <DayTotals
              plannedKcal={data.todayTotals.ok ? data.todayTotals.planned.kcal : 0}
              target={data.target}
              totals={data.todayTotals.ok ? data.todayTotals.totals : { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, fiber_incomplete: false }}
            />
          )}
        </Stack>
      </Card>

      <Stack gap={10}>
        <Row gap={10}>
          <Button icon="plus" onPress={() => router.push("/meal/new")} style={{ flex: 1 }}>New meal</Button>
          <Button onPress={() => router.push("/meal/plan")} style={{ flex: 1 }} variant="secondary">Plan meals</Button>
        </Row>
        <Row gap={10}>
          <Button icon="foods" onPress={() => router.push("/foods")} style={{ flex: 1 }} variant="secondary">Browse foods</Button>
          {/* Allergies and avoided foods live on Preferences, under Me. */}
          <Button icon="preferences" onPress={() => router.push("/preferences")} style={{ flex: 1 }} variant="ghost">Food settings</Button>
        </Row>
      </Stack>

      {view === "today" && data ? <CopyYesterday count={data.yesterdayToCopy} today={today} /> : null}

      <Segmented label="Meal days" onChange={setView} options={tabs} value={view} />

      {screen.error ? (
        <Alert tone="danger">Your meals could not be loaded. Please try again.</Alert>
      ) : !data ? (
        <LoadingView label="Loading meals…" />
      ) : data.days.length === 0 ? (
        <Txt tone="muted" variant="small">
          {emptyText[view]} {view !== "past" ? <TextLink onPress={() => router.push("/meal/plan")}>Plan meals</TextLink> : null}
        </Txt>
      ) : (
        data.days.map((day) => <DayCard day={day} key={day.date} today={today} />)
      )}
    </Screen>
  );
}

// "Copy yesterday": all of yesterday's meals saved again for today, unticked. Hidden when nothing is left to copy.
function CopyYesterday({ count, today }: { count: number; today: string }) {
  const [done, setDone] = useState<number>();
  const copy = useAction(copyMealDay, "Those meals could not be copied. Please try again.");
  if (done !== undefined) return <Alert tone="success">{`Copied ${done} ${done === 1 ? "meal" : "meals"} from yesterday. Tick each one when you eat it.`}</Alert>;
  if (count === 0) return null;
  return (
    <Stack gap={8}>
      <Button
        loading={copy.pending}
        loadingText="Copying…"
        onPress={async () => {
          const result = await copy.run(addDays(today, -1), today);
          if (result.ok && "count" in result) setDone(result.count);
        }}
        size="sm"
        variant="secondary"
      >
        Copy yesterday
      </Button>
      {copy.error ? <Alert tone="danger">{copy.error}</Alert> : null}
    </Stack>
  );
}

// A closed card shows one summary line; opening it lists the meals. Today starts open.
function DayCard({ day, today }: { day: MealDay; today: string }) {
  const { colors } = useTheme();
  const isToday = day.date === today;
  const [open, setOpen] = useState(isToday);
  return (
    <Card compact>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 }}>
        <Txt variant="h2">{formatDay(day.date)}</Txt>
        {isToday ? (
          <View style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Txt tone="onAccent" variant="xs" weight="bold">Today</Txt>
          </View>
        ) : null}
        <Txt numberOfLines={2} style={{ flex: 1, textAlign: "right" }} tone="muted" variant="small">{describeMealDay(day, today)}</Txt>
        <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
          <Icon color={colors.muted} name="chevron-right" />
        </View>
      </Pressable>
      {open ? (
        <Stack gap={12} style={{ marginTop: 12 }}>
          {day.meals.length > 1 ? (
            <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12, gap: 4 }}>
              <Txt variant="label">Prep for the day</Txt>
              <Txt tone="muted" variant="xs">All meals together, as picked (cooked foods in cooked weight).</Txt>
              {dayPrepList(day).map((food) => (
                <Row key={food.name} style={{ justifyContent: "space-between" }}>
                  <Txt style={{ flex: 1 }} variant="small">{food.name}</Txt>
                  <Txt variant="small" weight="semibold">{food.grams.toLocaleString("en-US")} g</Txt>
                </Row>
              ))}
            </View>
          ) : null}
          {day.meals.map((meal) => <MealRow date={day.date} key={meal.id} meal={meal} today={today} />)}
        </Stack>
      ) : null}
    </Card>
  );
}

function MealRow({ meal, date, today }: { meal: MealDayMeal; date: string; today: string }) {
  const { colors } = useTheme();
  const status = meal.eaten ? null : date < today ? "Not eaten" : "Planned";
  const [copied, setCopied] = useState<string>();
  const copy = useAction(copyMealToDate, "That meal could not be copied. Please try again.");
  const remove = useAction(deleteMeal, "The meal could not be deleted. Please try again.");

  async function removeMeal() {
    if (!(await confirmAction({ title: "Delete this meal?", message: `${meal.label} · ${formatKcal(meal.totals.kcal)}`, confirmLabel: "Yes, delete" }))) return;
    await remove.run(meal.id);
  }

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12, flexDirection: "row", gap: 12 }}>
      <View style={{ paddingTop: 2 }}>
        <MealEatenToggle eaten={meal.eaten} future={date > today} label={meal.label} mealId={meal.id} />
      </View>
      <Stack gap={4} style={{ flex: 1 }}>
        <Row gap={6} wrap>
          <Txt weight="bold">{meal.label}</Txt>
          <Txt tone="muted" variant="small">· {formatKcal(meal.totals.kcal)} · {formatGrams(meal.totals.protein_g)} protein</Txt>
          {status ? (
            <View style={{ borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 8, paddingVertical: 1 }}>
              <Txt tone="muted" variant="xs">{status}</Txt>
            </View>
          ) : null}
        </Row>
        <Txt variant="small">{meal.items.map((item) => `${item.name} ${item.grams} g`).join(" · ")}</Txt>
        <Txt tone="muted" variant="xs">
          Carbs {formatGrams(meal.totals.carbs_g)} · Fat {formatGrams(meal.totals.fat_g)} · Fiber {meal.totals.fiber_g === null ? "Incomplete" : formatGrams(meal.totals.fiber_g)}
        </Txt>
        <Row gap={16} wrap>
          {date < today ? (
            copied ? (
              <Txt tone="muted" variant="small">Logged as {copied} today.</Txt>
            ) : (
              <TextLink
                onPress={async () => {
                  const result = await copy.run(meal.id, clockNow().today);
                  if (result.ok && "label" in result) setCopied(result.label);
                }}
              >
                {copy.pending ? "Logging…" : "Log again today"}
              </TextLink>
            )
          ) : null}
          <TextLink onPress={() => router.push(`/meal/${meal.id}`)}>Edit</TextLink>
          <TextLink onPress={removeMeal} tone="danger">{remove.pending ? "Deleting…" : "Delete"}</TextLink>
        </Row>
        {copy.error ? <Txt tone="danger" variant="small">{copy.error}</Txt> : null}
        {remove.error ? <Txt tone="danger" variant="small">{remove.error}</Txt> : null}
      </Stack>
    </View>
  );
}
