import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { isCalendarDate } from "@/lib/meal";
import type { PreferredUnits } from "@/lib/weigh-in";
import { clearWorkoutDraft, readWorkoutDraft, workoutDraftKey, writeWorkoutDraft, type WorkoutDraft } from "@/lib/workout-draft";
import { convertWeightText, maxSetsPerExercise, weightUnit, type LogSlot, type SetFields } from "@/lib/workouts/log";
import { isBarbellExercise, plateText } from "@/lib/workouts/plates";
import { lastSessionSets, lastTimeText, progressionPrompt } from "@/lib/workouts/progression";
import { DateStepper } from "~/components/date-stepper";
import { Screen } from "~/components/screen";
import { Alert, Button, Chip, Field, Row, Segmented, Stack, TextLink, Tile, Txt } from "~/components/ui";
import { clockNow } from "~/lib/clock";
import { refreshAll } from "~/lib/query";
import { fetchLastSessions, saveWorkoutLog } from "~/services/workouts";
import { useTheme } from "~/theme/theme";

// The workout log form (web: src/components/workout-log-form.tsx). Unsaved sets are kept on the phone
// as a draft, so leaving the screen or closing the app does not lose them.

export type WorkoutLogInitial = {
  logId: string | null;
  templateKey: string;
  dayKey: string;
  date: string;
  duration: string;
  entries: Record<string, { exerciseKey: string; sets: SetFields[] }>;
};

type EntryState = { exerciseKey: string; sets: SetFields[] };
const blankSet: SetFields = { amount: "", weight: "" };
const offlineError = "Your workout could not be sent. Check your connection and press Save again.";

function storage(): Storage {
  return globalThis.localStorage as Storage;
}

function readDraft(key: string, slots: LogSlot[]): WorkoutDraft | null {
  try {
    return readWorkoutDraft(storage(), key, slots);
  } catch {
    return null;
  }
}

export function WorkoutLogForm({ initial, slots, units: savedUnits, showHistory }: { initial: WorkoutLogInitial; slots: LogSlot[]; units: PreferredUnits; showHistory: boolean }) {
  const { colors } = useTheme();
  const today = clockNow().today;
  const draftKey = workoutDraftKey(initial.logId, initial.templateKey, initial.dayKey);
  // What the form shows with no draft: the saved log when editing, otherwise the plan.
  const [baseline] = useState<WorkoutDraft>(() => ({
    date: initial.date || today,
    units: savedUnits,
    duration: initial.duration,
    entries: Object.fromEntries(
      slots.map((slot) => [slot.slotKey, initial.entries[slot.slotKey] ?? { exerciseKey: slot.plannedExerciseKey, sets: Array.from({ length: slot.plannedSets }, () => ({ ...blankSet })) }]),
    ),
  }));
  const [restored, setRestored] = useState(() => readDraft(draftKey, slots));
  const [date, setDate] = useState((restored ?? baseline).date);
  const [entries, setEntries] = useState<Record<string, EntryState>>((restored ?? baseline).entries);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<PreferredUnits>((restored ?? baseline).units);
  const [duration, setDuration] = useState((restored ?? baseline).duration ?? baseline.duration ?? "");
  // One save key per new workout, kept in the draft once Save is pressed, so pressing Save again
  // after a lost reply updates that workout instead of adding a second one.
  const [saveKey] = useState(() => restored?.saveKey ?? (initial.logId ? undefined : globalThis.crypto?.randomUUID?.()));
  const [keySent, setKeySent] = useState(() => restored?.saveKey !== undefined);

  // Keep the draft in step with the form. A form that matches its starting point keeps no draft.
  useEffect(() => {
    const current: WorkoutDraft = { date, units, duration, entries };
    try {
      if (!keySent && JSON.stringify(current) === JSON.stringify(baseline)) clearWorkoutDraft(storage(), draftKey);
      else writeWorkoutDraft(storage(), draftKey, keySent && saveKey ? { ...current, saveKey } : current);
    } catch {
      // Storage can fail; the form still works without a draft.
    }
  }, [date, units, entries, duration, baseline, draftKey, keySent, saveKey]);

  function discardDraft() {
    setDate(baseline.date);
    setUnits(baseline.units);
    setEntries(baseline.entries);
    setDuration(baseline.duration ?? "");
    setRestored(null);
    setKeySent(false);
  }

  // Earlier sessions before the chosen date, loaded again when the date changes.
  const exerciseKeys = [...new Set(slots.flatMap((slot) => slot.choices.map((choice) => choice.key)))];
  const history = useQuery({
    queryKey: ["workouts", "last-sessions", date, exerciseKeys.join(",")],
    queryFn: () => fetchLastSessions(date, exerciseKeys),
    enabled: showHistory && isCalendarDate(date),
  });
  const sessions = history.data?.ok ? history.data.sessions : undefined;

  function updateEntry(slotKey: string, change: (entry: EntryState) => EntryState) {
    setEntries((current) => ({ ...current, [slotKey]: change(current[slotKey]) }));
  }
  function chooseExercise(slot: LogSlot, exerciseKey: string) {
    const loaded = slot.choices.find((choice) => choice.key === exerciseKey)?.loaded ?? false;
    // An unloaded exercise has no weight, so clear any weights typed for the previous choice.
    updateEntry(slot.slotKey, (entry) => ({ exerciseKey, sets: loaded ? entry.sets : entry.sets.map((set) => ({ ...set, weight: "" })) }));
  }
  // Typed weights are converted so they keep meaning the same weight in the new unit.
  function switchUnits(next: PreferredUnits) {
    if (next === units) return;
    setEntries((current) =>
      Object.fromEntries(Object.entries(current).map(([slotKey, entry]) => [slotKey, { ...entry, sets: entry.sets.map((set) => ({ ...set, weight: convertWeightText(set.weight, units, next) })) }])),
    );
    setUnits(next);
  }
  function updateSet(slotKey: string, index: number, changes: Partial<SetFields>) {
    updateEntry(slotKey, (entry) => ({ ...entry, sets: entry.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...changes } : set)) }));
  }

  async function submit() {
    setSaving(true);
    setError(undefined);
    if (saveKey) {
      setKeySent(true);
      try {
        writeWorkoutDraft(storage(), draftKey, { date, units, duration, entries, saveKey });
      } catch {}
    }
    let result: Awaited<ReturnType<typeof saveWorkoutLog>>;
    try {
      result = await saveWorkoutLog({
        logId: initial.logId,
        saveKey,
        templateKey: initial.templateKey,
        dayKey: initial.dayKey,
        date,
        units,
        duration,
        entries: slots.map((slot) => ({ slotKey: slot.slotKey, ...entries[slot.slotKey] })),
      });
    } catch {
      // No connection, or the reply was lost on the way back.
      setSaving(false);
      setError(saveKey || initial.logId ? `${offlineError} It will not be saved twice.` : offlineError);
      return;
    }
    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }
    try {
      clearWorkoutDraft(storage(), draftKey);
    } catch {}
    // Go back straight away; every screen reloads its data in the background.
    void refreshAll();
    router.dismissTo({ pathname: "/train", params: { saved: initial.logId ? "updated" : "new" } });
  }

  return (
    <Screen
      footer={
        <Stack gap={8}>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Button full loading={saving} loadingText="Saving…" onPress={submit}>Save workout</Button>
        </Stack>
      }
    >
      {restored ? (
        <Alert tone="warn">
          <Row style={{ justifyContent: "space-between" }} wrap>
            <Txt tone="warn" variant="small">Restored your unsaved workout.</Txt>
            <Button onPress={discardDraft} size="sm" variant="secondary">Discard draft</Button>
          </Row>
        </Alert>
      ) : null}
      <DateStepper label="Date" onChange={setDate} today={today} value={date} />
      <Row align="flex-start">
        <Stack gap={6} style={{ flex: 1 }}>
          <Txt variant="label">Weight units</Txt>
          <Segmented label="Weight units" onChange={switchUnits} options={[{ value: "metric", label: weightUnit("metric") }, { value: "imperial", label: weightUnit("imperial") }]} value={units} />
        </Stack>
        <Field keyboardType="number-pad" label="Duration (minutes)" onChangeText={setDuration} style={{ flex: 1 }} value={duration} />
      </Row>
      <Txt tone="muted" variant="small">Fill in the sets you did. Leave a set empty to skip it.</Txt>
      {/* Placeholder effort guidance pending qualified review (docs/PHASE3.md). */}
      <Tile>
        <Txt variant="small"><Txt variant="small" weight="semibold">How hard?</Txt> <Txt tone="muted" variant="small">End each set when you could do about 1–3 more good reps. Stop if form breaks down or anything hurts.</Txt></Txt>
      </Tile>

      {slots.map((slot) => {
        const entry = entries[slot.slotKey];
        const choice = slot.choices.find((item) => item.key === entry.exerciseKey) ?? slot.choices[0];
        const amountLabel = choice.measure === "seconds" ? "Seconds" : "Reps";
        const last = sessions?.[entry.exerciseKey];
        const prompt = last ? progressionPrompt(last, choice, slot.plannedSets, units) : null;
        return (
          <View key={slot.slotKey} style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, padding: 14, gap: 10 }}>
            <Stack gap={6}>
              <Txt variant="label">Exercise</Txt>
              {slot.choices.length > 1 ? (
                <Row gap={8} wrap>
                  {slot.choices.map((item) => <Chip key={item.key} label={item.label} onPress={() => chooseExercise(slot, item.key)} selected={entry.exerciseKey === item.key} />)}
                </Row>
              ) : (
                <Txt variant="h2">{choice.label}</Txt>
              )}
            </Stack>
            <Txt tone="muted" variant="small">Plan: {slot.planText}</Txt>
            {choice.cue ? <Txt style={{ fontStyle: "italic" }} tone="muted" variant="small">{choice.cue}</Txt> : null}
            {sessions ? (
              <Stack gap={6}>
                <Txt tone="muted" variant="small">Last time: {last ? lastTimeText(last, choice.measure, units) : "not logged yet"}</Txt>
                {last ? (
                  <Button accessibilityLabel={`Use last time for ${choice.label}`} onPress={() => updateEntry(slot.slotKey, (current) => ({ ...current, sets: lastSessionSets(last, choice, units) }))} size="sm" variant="secondary">
                    Use last time
                  </Button>
                ) : null}
                {prompt ? <Txt variant="small" weight="semibold">{prompt}</Txt> : null}
              </Stack>
            ) : null}
            {entry.sets.map((set, index) => {
              const plates = choice.loaded && isBarbellExercise(choice.key) ? plateText(set.weight, units) : null;
              return (
                <Stack gap={4} key={index}>
                  <Row align="flex-end" gap={10}>
                    <Txt style={{ width: 48, paddingBottom: 12 }} variant="label">Set {index + 1}</Txt>
                    <Field accessibilityLabel={`Set ${index + 1} ${amountLabel.toLowerCase()}`} keyboardType="number-pad" label={amountLabel} labelHidden={index > 0} onChangeText={(amount) => updateSet(slot.slotKey, index, { amount })} style={{ flex: 1 }} value={set.amount} />
                    {choice.loaded ? <Field accessibilityLabel={`Set ${index + 1} weight${choice.perDumbbell ? " per dumbbell" : ""} (${weightUnit(units)})`} keyboardType="decimal-pad" label={`${choice.perDumbbell ? "Weight per dumbbell" : "Weight"} (${weightUnit(units)})`} labelHidden={index > 0} onChangeText={(weight) => updateSet(slot.slotKey, index, { weight })} style={{ flex: 1 }} value={set.weight} /> : null}
                  </Row>
                  {plates ? <Txt tone="muted" variant="small">{plates}</Txt> : null}
                </Stack>
              );
            })}
            {entry.sets.length < maxSetsPerExercise ? (
              <TextLink onPress={() => updateEntry(slot.slotKey, (current) => ({ ...current, sets: [...current.sets, { ...blankSet }] }))}>Add set</TextLink>
            ) : null}
          </View>
        );
      })}
    </Screen>
  );
}
