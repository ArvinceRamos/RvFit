import { router } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { choiceLabel, formatCalendarDate, planSummary, restText, schemeText } from "@/lib/workouts/format";
import { nextWorkout } from "@/lib/workouts/next-up";
import { scheduleSummary, weekdayByDayKey } from "@/lib/workouts/schedule";
import { orderSwaps } from "@/lib/workouts/swaps";
import { applySwaps, resolveTemplate, resolveTemplateByKey, swapOptions } from "@/lib/workouts/templates";
import { weekStart } from "@/lib/week";
import { Icon } from "~/components/icon";
import { ErrorView, LoadingView, Screen } from "~/components/screen";
import { Alert, Button, Card, Row, Stack, TextLink, Txt } from "~/components/ui";
import { confirmAction, useAction } from "~/lib/actions";
import { clockNow } from "~/lib/clock";
import { keys } from "~/lib/query";
import { supabase } from "~/lib/supabase";
import { useNoticeParam } from "~/lib/use-notice-param";
import { useScreenData } from "~/lib/use-screen-data";
import { deleteWorkoutLog, resetSwap, saveSwap } from "~/services/workouts";
import { useTheme } from "~/theme/theme";

const recentWorkoutLimit = 10;

function dayName(templateKey: string, dayKey: string): string {
  return resolveTemplateByKey(templateKey)?.days.find((day) => day.key === dayKey)?.name ?? dayKey;
}

// The same reads as the web Workouts page.
async function loadTrain(today: string) {
  const [{ data: saved, error }, { data: recent, error: recentError }, { data: weekLogs }] = await Promise.all([
    supabase.from("user_preferences").select("experience, equipment, training_days").maybeSingle(),
    supabase.from("workout_logs").select("id, template_key, day_key, performed_on, workout_log_sets(count)").order("performed_on", { ascending: false }).order("created_at", { ascending: false }).limit(recentWorkoutLimit),
    // This week's logs, for "Next up". If they cannot be read, the badge is simply left out.
    supabase.from("workout_logs").select("template_key, day_key").gte("performed_on", weekStart(today)).lte("performed_on", today),
  ]);
  // Never guess level, equipment, or days. A saved row that no longer fits any template is treated as not set.
  const defaultTemplate = saved ? resolveTemplate(saved.experience, saved.training_days, saved.equipment) : null;
  const { data: savedSwaps, error: swapsError } = defaultTemplate
    ? await supabase.from("user_exercise_swaps").select("slot_key, exercise_key, updated_at").eq("template_key", defaultTemplate.key)
    : { data: null, error: null };
  const template = defaultTemplate ? applySwaps(defaultTemplate, orderSwaps(savedSwaps ?? [])) : null;
  const nextUp = defaultTemplate && saved && weekLogs
    ? nextWorkout(defaultTemplate.days, saved.training_days, weekLogs.filter((log) => log.template_key === defaultTemplate.key).map((log) => log.day_key))
    : null;
  const defaultExerciseBySlot = new Map(defaultTemplate?.days.flatMap((day) => day.slots.map((slot) => [slot.key, slot.exercise.key] as const)));
  return { ok: true as const, planError: Boolean(error || swapsError), template, nextUp, defaultExerciseBySlot, recent: recentError ? null : recent ?? [] };
}

// Train (web: /workouts): the plan from Preferences with swaps, and recent workouts.
export default function Train() {
  const saved = useNoticeParam("saved");
  const { today } = clockNow();
  const screen = useScreenData([...keys.workouts, today], () => loadTrain(today));
  if (screen.loading) return <LoadingView label="Loading your plan…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "Your workout plan could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { planError, template, nextUp, defaultExerciseBySlot, recent } = screen.data;

  return (
    <Screen onRefresh={screen.refresh} refreshing={screen.refreshing} topInset>
      <Txt variant="title">Train</Txt>
      {saved === "new" || saved === "updated" ? (
        <Alert tone="success">
          <Txt variant="small">{saved === "updated" ? "Workout updated." : "Workout saved. Nice work."} <TextLink onPress={() => router.navigate("/progress")}>See your progress</TextLink></Txt>
        </Alert>
      ) : null}

      {planError ? (
        <Alert tone="danger">Your workout plan could not be loaded. Please try again.</Alert>
      ) : !template ? (
        <Card>
          <Stack gap={12}>
            <Txt tone="muted" variant="small">Save your experience, equipment, and training days in Preferences to see your workout plan.</Txt>
            <Button onPress={() => router.push("/preferences")}>Go to Preferences</Button>
          </Stack>
        </Card>
      ) : (
        <>
          <Txt tone="muted" variant="small">
            {planSummary(template.level, template.days.length, template.equipment)} · {nextUp ? `${nextUp.done} of ${nextUp.planned} done this week · ` : ""}
            <TextLink onPress={() => router.push("/preferences")}>Change plan</TextLink>
          </Txt>
          {scheduleSummary(template.days) ? <Txt tone="muted" variant="small">{scheduleSummary(template.days)}</Txt> : null}
          {template.days.map((day) => (
            <DayPlan
              day={day}
              weekday={weekdayByDayKey(template.days).get(day.key)}
              defaultExerciseBySlot={defaultExerciseBySlot}
              isNext={nextUp?.status === "next" && nextUp.dayKey === day.key}
              key={day.key}
              template={template}
            />
          ))}
        </>
      )}

      <Stack gap={12} style={{ marginTop: 8 }}>
        <Txt variant="h1">Recent workouts</Txt>
        {recent === null ? (
          <Alert tone="danger">Your recent workouts could not be loaded. Please try again.</Alert>
        ) : recent.length === 0 ? (
          <Txt tone="muted" variant="small">No workouts logged yet.</Txt>
        ) : (
          recent.map((log) => <RecentWorkout key={log.id} log={log} />)
        )}
      </Stack>
    </Screen>
  );
}

type PlanTemplate = NonNullable<Awaited<ReturnType<typeof loadTrain>>["template"]>;

function DayPlan({ day, weekday, template, isNext, defaultExerciseBySlot }: { day: PlanTemplate["days"][number]; weekday?: string; template: PlanTemplate; isNext: boolean; defaultExerciseBySlot: Map<string, string> }) {
  const { colors } = useTheme();
  return (
    <Card>
      <Stack gap={14}>
        <Row style={{ justifyContent: "space-between" }} wrap>
          <Row gap={8}>
            <Txt variant="section">{weekday ? <Txt tone="muted" variant="small">{weekday} </Txt> : null}{day.name}</Txt>
            {isNext ? (
              <View style={{ borderRadius: 999, backgroundColor: colors.accent, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Txt tone="onAccent" variant="xs" weight="bold">Next up</Txt>
              </View>
            ) : null}
          </Row>
          <Button onPress={() => router.push(`/workout/new?day=${day.key}`)} size="sm">Log this workout</Button>
        </Row>
        {day.slots.map((slot) => {
          const defaultKey = defaultExerciseBySlot.get(slot.key);
          return (
            <Stack gap={2} key={slot.key}>
              <Txt weight="semibold">{slot.exercise.name}</Txt>
              <Txt tone="muted" variant="small">{schemeText(slot.scheme, slot.exercise)} · {restText(slot.scheme)}</Txt>
              {slot.exercise.cue ? <Txt accessibilityRole="text" style={{ fontStyle: "italic" }} tone="muted" variant="small">{slot.exercise.cue}</Txt> : null}
              <SwapControl
                choices={swapOptions(template, slot.key).filter((option) => option.key !== defaultKey).map((option) => ({ key: option.key, label: choiceLabel(option) }))}
                isSwapped={slot.exercise.key !== defaultKey}
                slotKey={slot.key}
                templateKey={template.key}
              />
            </Stack>
          );
        })}
      </Stack>
    </Card>
  );
}

function SwapControl({ templateKey, slotKey, choices, isSwapped }: { templateKey: string; slotKey: string; choices: { key: string; label: string }[]; isSwapped: boolean }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const swap = useAction(saveSwap, "Your swap could not be saved. Please try again.");
  const reset = useAction(resetSwap, "Your swap could not be reset. Please try again.");
  const busy = swap.pending || reset.pending;
  if (choices.length === 0 && !isSwapped) return null;

  return (
    <Stack gap={6}>
      <Row gap={16}>
        {choices.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 }}>
            <Txt style={{ textDecorationLine: "underline" }} variant="label">Swap</Txt>
            <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}><Icon color={colors.muted} name="chevron-down" size={16} /></View>
          </Pressable>
        ) : null}
        {isSwapped ? (
          <TextLink onPress={async () => { if (!busy && (await reset.run({ templateKey, slotKey })).ok) setOpen(false); }}>Reset to default</TextLink>
        ) : null}
      </Row>
      {open ? (
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
          {choices.map((choice, index) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              key={choice.key}
              onPress={async () => {
                if ((await swap.run({ templateKey, slotKey, exerciseKey: choice.key })).ok) setOpen(false);
              }}
              style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 12, minHeight: 46, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.line, backgroundColor: pressed ? colors.selected : "transparent", opacity: busy ? 0.6 : 1 })}
            >
              <Txt variant="small">{choice.label}</Txt>
            </Pressable>
          ))}
        </View>
      ) : null}
      {swap.error || reset.error ? <Txt tone="danger" variant="small">{swap.error ?? reset.error}</Txt> : null}
    </Stack>
  );
}

function RecentWorkout({ log }: { log: { id: string; template_key: string; day_key: string; performed_on: string; workout_log_sets: unknown } }) {
  // PostgREST returns the set count as a one-item list.
  const setCount = (log.workout_log_sets as { count: number }[])[0]?.count ?? 0;
  const remove = useAction(deleteWorkoutLog, "The workout could not be deleted. Please try again.");
  async function removeWorkout() {
    if (!(await confirmAction({ title: "Delete this workout?", message: `${dayName(log.template_key, log.day_key)} · ${formatCalendarDate(log.performed_on)}`, confirmLabel: "Yes, delete" }))) return;
    await remove.run(log.id);
  }
  return (
    <Card compact>
      <Row align="flex-start" style={{ justifyContent: "space-between" }}>
        <Stack gap={2} style={{ flex: 1 }}>
          <Txt weight="bold">{dayName(log.template_key, log.day_key)}</Txt>
          <Txt tone="muted" variant="small">{formatCalendarDate(log.performed_on)} · {setCount} {setCount === 1 ? "set" : "sets"}</Txt>
        </Stack>
        <Row gap={16}>
          <TextLink onPress={() => router.push(`/workout/${log.id}`)}>Edit</TextLink>
          <TextLink onPress={removeWorkout} tone="danger">{remove.pending ? "Deleting…" : "Delete"}</TextLink>
        </Row>
      </Row>
      {remove.error ? <Txt tone="danger" variant="small">{remove.error}</Txt> : null}
    </Card>
  );
}
