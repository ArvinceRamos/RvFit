"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadLastSessionsAction, saveWorkoutLogAction, type LastSessionsResult } from "@/app/workouts/actions";
import { isCalendarDate } from "@/lib/meal";
import type { PreferredUnits } from "@/lib/weigh-in";
import { convertWeightText, maxSetsPerExercise, weightUnit, type LogSlot, type SetFields } from "@/lib/workouts/log";
import { lastTimeText, progressionPrompt } from "@/lib/workouts/progression";

export type WorkoutLogInitial = {
  logId: string | null;
  templateKey: string;
  dayKey: string;
  date: string;
  /** Saved entries by slot key, when editing. Slots without one start from the plan. */
  entries: Record<string, { exerciseKey: string; sets: SetFields[] }>;
};

type EntryState = { exerciseKey: string; sets: SetFields[] };

const fieldClass = "w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal";
const blankSet: SetFields = { amount: "", weight: "" };

function localToday(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function WorkoutLogForm({ initial, slots, units: savedUnits, showHistory }: {
  initial: WorkoutLogInitial;
  slots: LogSlot[];
  /** The user's saved units. The kg/lb switch starts here. */
  units: PreferredUnits;
  /** New workouts show the last session and an optional progression prompt. Edits do not. */
  showHistory: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial.date || localToday());
  const [entries, setEntries] = useState<Record<string, EntryState>>(() =>
    Object.fromEntries(
      slots.map((slot) => [
        slot.slotKey,
        initial.entries[slot.slotKey] ?? {
          exerciseKey: slot.plannedExerciseKey,
          sets: Array.from({ length: slot.plannedSets }, () => ({ ...blankSet })),
        },
      ]),
    ),
  );
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<PreferredUnits>(savedUnits);

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
    const result = await saveWorkoutLogAction({
      logId: initial.logId,
      templateKey: initial.templateKey,
      dayKey: initial.dayKey,
      date,
      units,
      entries: slots.map((slot) => ({ slotKey: slot.slotKey, ...entries[slot.slotKey] })),
    });
    if (!result.ok) {
      setSaving(false);
      setError(result.error);
      return;
    }
    router.push("/workouts");
    router.refresh();
  }

  return (
    <form className="mt-6 grid grid-cols-1 gap-6" onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
          Date
          <input className={fieldClass} onChange={(event) => setDate(event.target.value)} required suppressHydrationWarning type="date" value={date} />
        </label>
        <div className="grid grid-cols-1 gap-1 text-sm font-semibold">
          <span id="weight-units-label">Weight units</span>
          <div aria-labelledby="weight-units-label" className="inline-flex w-fit rounded-lg border border-zinc-300 bg-white p-1" role="group">
            {(["metric", "imperial"] as const).map((option) => (
              <button
                aria-pressed={units === option}
                className={`rounded-md px-4 py-1.5 text-base font-semibold ${units === option ? "bg-lime-400 text-zinc-950" : "text-zinc-700 hover:bg-zinc-100"}`}
                key={option}
                onClick={() => switchUnits(option)}
                type="button"
              >
                {weightUnit(option)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-zinc-700">Fill in the sets you did. Leave a set empty to skip it.</p>

      {slots.map((slot) => {
        const entry = entries[slot.slotKey];
        const choice = slot.choices.find((item) => item.key === entry.exerciseKey) ?? slot.choices[0];
        const amountLabel = choice.measure === "seconds" ? "Seconds" : "Reps";
        return (
          <section className="rounded-xl border border-zinc-200 bg-white p-4" key={slot.slotKey}>
            <label className="grid grid-cols-1 gap-1 text-sm font-semibold">
              Exercise
              <select className={fieldClass} onChange={(event) => chooseExercise(slot, event.target.value)} value={entry.exerciseKey}>
                {slot.choices.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <p className="mt-2 text-sm text-zinc-600">Plan: {slot.planText}</p>
            {sessions && (() => {
              const last = sessions[entry.exerciseKey];
              const prompt = last ? progressionPrompt(last, choice, slot.plannedSets, units) : null;
              return (
                <>
                  <p className="mt-1 text-sm text-zinc-600">Last time: {last ? lastTimeText(last, choice.measure, units) : "not logged yet"}</p>
                  {prompt && <p className="mt-1 text-sm font-semibold text-zinc-800">{prompt}</p>}
                </>
              );
            })()}

            <ol className="mt-3 grid gap-2">
              {entry.sets.map((set, index) => (
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
                </li>
              ))}
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

      {error && <p aria-live="polite" className="text-sm text-red-800">{error}</p>}
      <button className="w-fit rounded-lg bg-lime-400 px-4 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
        {saving ? "Saving…" : "Save workout"}
      </button>
    </form>
  );
}
