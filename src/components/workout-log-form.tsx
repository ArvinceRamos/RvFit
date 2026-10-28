"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { loadLastSessionsAction, saveWorkoutLogAction, type LastSessionsResult } from "@/app/workouts/actions";
import { isCalendarDate } from "@/lib/meal";
import type { PreferredUnits } from "@/lib/weigh-in";
import { clearWorkoutDraft, readWorkoutDraft, workoutDraftKey, writeWorkoutDraft, type WorkoutDraft } from "@/lib/workout-draft";
import { convertWeightText, maxSetsPerExercise, weightUnit, type LogSlot, type SetFields } from "@/lib/workouts/log";
import { isBarbellExercise, plateText } from "@/lib/workouts/plates";
import { lastSessionSets, lastTimeText, progressionPrompt } from "@/lib/workouts/progression";

export type WorkoutLogInitial = {
  logId: string | null;
  templateKey: string;
  dayKey: string;
  date: string;
  /** The saved Duration (minutes) as text; blank when none. */
  duration: string;
  /** Saved entries by slot key, when editing. Slots without one start from the plan. */
  entries: Record<string, { exerciseKey: string; sets: SetFields[] }>;
};

type EntryState = { exerciseKey: string; sets: SetFields[] };

const fieldClass = "field w-full min-w-0";
const blankSet: SetFields = { amount: "", weight: "" };

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

type WorkoutLogFormProps = {
  initial: WorkoutLogInitial;
  slots: LogSlot[];
  /** The user's saved units. The kg/lb switch starts here. */
  units: PreferredUnits;
  /** New workouts show the last session and an optional progression prompt. Edits do not. */
  showHistory: boolean;
};

const subscribeNever = () => () => {};

const offlineError = "Your workout could not be sent. Check your connection and press Save again.";

// randomUUID needs a secure page (https or localhost). Without it there is no key, and a retry
// behaves as before.
function newSaveKey(): string | undefined {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : undefined;
}

// The server cannot see the browser's saved draft, so the form renders from the plan first
// and starts again from the draft (if any) once it is running in the browser.
export function WorkoutLogForm(props: WorkoutLogFormProps) {
  const inBrowser = useSyncExternalStore(subscribeNever, () => true, () => false);
  return <LogForm key={inBrowser ? "browser" : "server"} {...props} inBrowser={inBrowser} />;
}

function readDraft(key: string, slots: LogSlot[]): WorkoutDraft | null {
  try {
    return readWorkoutDraft(window.localStorage, key, slots);
  } catch {
    return null;
  }
}

function LogForm({ initial, slots, units: savedUnits, showHistory, inBrowser }: WorkoutLogFormProps & { inBrowser: boolean }) {
  const router = useRouter();
  const draftKey = workoutDraftKey(initial.logId, initial.templateKey, initial.dayKey);
  // What the form shows with no draft: the saved log when editing, otherwise the plan.
  const [baseline] = useState<WorkoutDraft>(() => ({
    date: initial.date || localToday(),
    units: savedUnits,
    duration: initial.duration,
    entries: Object.fromEntries(
      slots.map((slot) => [
        slot.slotKey,
        initial.entries[slot.slotKey] ?? {
          exerciseKey: slot.plannedExerciseKey,
          sets: Array.from({ length: slot.plannedSets }, () => ({ ...blankSet })),
        },
      ]),
    ),
  }));
  const [restored, setRestored] = useState(() => (inBrowser ? readDraft(draftKey, slots) : null));
  const [date, setDate] = useState((restored ?? baseline).date);
  const [entries, setEntries] = useState<Record<string, EntryState>>((restored ?? baseline).entries);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<PreferredUnits>((restored ?? baseline).units);
  // A draft from before this field existed keeps the saved duration.
  const [duration, setDuration] = useState((restored ?? baseline).duration ?? baseline.duration ?? "");
  // A new workout has one save key. Once Save is pressed it is kept in the draft, so pressing Save
  // again (after a lost reply or a reload) updates that workout instead of adding a second one.
  const [saveKey] = useState(() => restored?.saveKey ?? (initial.logId ? undefined : newSaveKey()));
  const [keySent, setKeySent] = useState(() => restored?.saveKey !== undefined);

  // Keep the draft in step with the form. A form that matches its starting point keeps no draft.
  useEffect(() => {
    if (!inBrowser) return;
    const current: WorkoutDraft = { date, units, duration, entries };
    try {
      if (!keySent && JSON.stringify(current) === JSON.stringify(baseline)) clearWorkoutDraft(window.localStorage, draftKey);
      else writeWorkoutDraft(window.localStorage, draftKey, keySent && saveKey ? { ...current, saveKey } : current);
    } catch {
      // Storage can be blocked or full; the form still works without a draft.
    }
  }, [inBrowser, date, units, entries, duration, baseline, draftKey, keySent, saveKey]);

  function discardDraft() {
    setDate(baseline.date);
    setUnits(baseline.units);
    setEntries(baseline.entries);
    setDuration(baseline.duration ?? "");
    setRestored(null);
    setKeySent(false);
  }

  // Earlier sessions before the chosen date, fetched again whenever the date changes.
  const [history, setHistory] = useState<{ date: string; result: LastSessionsResult }>();
  const exerciseKeys = [...new Set(slots.flatMap((slot) => slot.choices.map((choice) => choice.key)))];
  const exerciseKeysText = exerciseKeys.join(",");
  const canLoadHistory = showHistory && isCalendarDate(date);
  useEffect(() => {
    if (!canLoadHistory) return;
    let cancelled = false;
    loadLastSessionsAction(date, exerciseKeysText.split(","))
      .then((result) => { if (!cancelled) setHistory({ date, result }); })
      .catch(() => { if (!cancelled) setHistory({ date, result: { ok: false } }); });
    return () => { cancelled = true; };
  }, [canLoadHistory, date, exerciseKeysText]);
  const sessions = history?.date === date && history.result.ok ? history.result.sessions : undefined;

  function updateEntry(slotKey: string, change: (entry: EntryState) => EntryState) {
    setEntries((current) => ({ ...current, [slotKey]: change(current[slotKey]) }));
  }

  function chooseExercise(slot: LogSlot, exerciseKey: string) {
    const loaded = slot.choices.find((choice) => choice.key === exerciseKey)?.loaded ?? false;
    // An unloaded exercise has no weight, so clear any weights typed for the previous choice.
    updateEntry(slot.slotKey, (entry) => ({
      exerciseKey,
      sets: loaded ? entry.sets : entry.sets.map((set) => ({ ...set, weight: "" })),
    }));
  }

  // Typed weights are converted so they keep meaning the same weight in the new unit.
  function switchUnits(next: PreferredUnits) {
    if (next === units) return;
    setEntries((current) =>
      Object.fromEntries(
        Object.entries(current).map(([slotKey, entry]) => [
          slotKey,
          { ...entry, sets: entry.sets.map((set) => ({ ...set, weight: convertWeightText(set.weight, units, next) })) },
        ]),
      ),
    );
    setUnits(next);
  }

  function updateSet(slotKey: string, index: number, changes: Partial<SetFields>) {
    updateEntry(slotKey, (entry) => ({
      ...entry,
      sets: entry.sets.map((set, setIndex) => (setIndex === index ? { ...set, ...changes } : set)),
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    if (saveKey) {
      setKeySent(true);
      try {
        writeWorkoutDraft(window.localStorage, draftKey, { date, units, duration, entries, saveKey });
      } catch {
        // Without storage the key still lasts until the page is closed.
      }
    }
    let result: Awaited<ReturnType<typeof saveWorkoutLogAction>>;
    try {
      result = await saveWorkoutLogAction({
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
      clearWorkoutDraft(window.localStorage, draftKey);
    } catch {
      // Nothing to clear when storage is blocked.
    }
    // Workouts reads its data on the server, so it shows the new log when it opens.
    router.push(initial.logId ? "/workouts?saved=updated" : "/workouts?saved=new");
  }

  return (
    <form className="mt-6 grid grid-cols-1 gap-6" onSubmit={submit}>
      {restored && (
        <div className="alert-warn flex flex-wrap items-center justify-between gap-3" role="status">
          <span>Restored your unsaved workout.</span>
          <button className="btn-secondary btn-sm" onClick={discardDraft} type="button">Discard draft</button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
          Date
          <input className={fieldClass} onChange={(event) => setDate(event.target.value)} required suppressHydrationWarning type="date" value={date} />
        </label>
        <div className="grid grid-cols-1 gap-1 text-sm font-semibold">
          <span id="weight-units-label">Weight units</span>
          <div aria-labelledby="weight-units-label" className="segmented w-fit text-base" role="group">
            {(["metric", "imperial"] as const).map((option) => (
              <button
                aria-pressed={units === option}
                key={option}
                onClick={() => switchUnits(option)}
                type="button"
              >
                {weightUnit(option)}
              </button>
            ))}
          </div>
        </div>
        <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
          Duration (minutes)
          <input autoComplete="off" className={fieldClass} inputMode="numeric" name="duration" onChange={(event) => setDuration(event.target.value)} type="text" value={duration} />
        </label>
      </div>

      <p className="text-sm text-muted">Fill in the sets you did. Leave a set empty to skip it.</p>
      {/* Placeholder effort guidance pending qualified review (docs/PHASE3.md). */}
      <p className="tile px-3 py-2 text-sm"><span className="font-semibold">How hard?</span> <span className="text-muted">End each set when you could do about 1–3 more good reps. Stop if form breaks down or anything hurts.</span></p>

      {slots.map((slot) => {
        const entry = entries[slot.slotKey];
        const choice = slot.choices.find((item) => item.key === entry.exerciseKey) ?? slot.choices[0];
        const amountLabel = choice.measure === "seconds" ? "Seconds" : "Reps";
        return (
          <section className="rounded-xl border border-line bg-card p-4" key={slot.slotKey}>
            <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
              Exercise
              <select className={fieldClass} onChange={(event) => chooseExercise(slot, event.target.value)} value={entry.exerciseKey}>
                {slot.choices.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <p className="mt-2 text-sm text-muted">Plan: {slot.planText}</p>
            {choice.cue && <p className="mt-1 text-sm italic text-muted"><span className="sr-only">Form tip: </span>{choice.cue}</p>}
            {sessions && (() => {
              const last = sessions[entry.exerciseKey];
              const prompt = last ? progressionPrompt(last, choice, slot.plannedSets, units) : null;
              return (
                <>
                  <p className="mt-1 text-sm text-muted">Last time: {last ? lastTimeText(last, choice.measure, units) : "not logged yet"}</p>
                  {last && (
                    <button
                      aria-label={`Use last time for ${choice.label}`}
                      className="btn-secondary btn-sm mt-2"
                      onClick={() => updateEntry(slot.slotKey, (current) => ({ ...current, sets: lastSessionSets(last, choice, units) }))}
                      type="button"
                    >
                      Use last time
                    </button>
                  )}
                  {prompt && <p className="mt-1 text-sm font-semibold text-ink">{prompt}</p>}
                </>
              );
            })()}

            <ol className="mt-3 grid gap-2">
              {entry.sets.map((set, index) => {
                const plates = choice.loaded && isBarbellExercise(choice.key) ? plateText(set.weight, units) : null;
                return (
                  <li className="flex flex-wrap items-end gap-3" key={index}>
                    <span className="w-12 pb-2 text-sm font-semibold">Set {index + 1}</span>
                    <label className="grid w-24 grid-cols-1 gap-1 text-sm">
                      {amountLabel}
                      <input className={fieldClass} inputMode="numeric" onChange={(event) => updateSet(slot.slotKey, index, { amount: event.target.value })} type="text" value={set.amount} />
                    </label>
                    {choice.loaded && (
                      <label className="grid w-28 grid-cols-1 gap-1 text-sm">
                        Weight ({weightUnit(units)})
                        <input className={fieldClass} inputMode="decimal" onChange={(event) => updateSet(slot.slotKey, index, { weight: event.target.value })} type="text" value={set.weight} />
                      </label>
                    )}
                    {plates && <p className="basis-full text-sm text-muted">{plates}</p>}
                  </li>
                );
              })}
            </ol>
            {entry.sets.length < maxSetsPerExercise && (
              <button
                className="mt-3 text-sm font-semibold underline"
                onClick={() => updateEntry(slot.slotKey, (current) => ({ ...current, sets: [...current.sets, { ...blankSet }] }))}
                type="button"
              >
                Add set
              </button>
            )}
          </section>
        );
      })}

      {error && <p className="alert-danger" role="alert">{error}</p>}
      <button className="btn-primary w-fit" disabled={saving} type="submit">
        {saving ? "Saving…" : "Save workout"}
      </button>
    </form>
  );
}
