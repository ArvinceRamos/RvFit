"use client";

import { useId, useState } from "react";
import { saveSleepAction, saveStepsAction, type SaveDailyActivityResult } from "@/app/dashboard/actions";
import { Icon } from "@/components/icon";
import { localToday } from "@/components/today-summary";
import { sleepFields } from "@/lib/activity/inputs";

const SAVED = "Saved.";

// Steps today and Sleep last night, each saved on the browser's local date. Saving again replaces the value.
// The fields start with today's saved values. Each save re-renders Today, so Burned today counts new steps.
export function StepsSleepCard({ steps, sleepMinutes, className = "" }: { steps: number | null; sleepMinutes: number | null; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="dashboard" />Steps and sleep</h2>
      <div className="mt-4 grid gap-6">
        <StepsForm initial={steps === null ? "" : String(steps)} />
        <SleepForm initial={sleepFields(sleepMinutes)} />
      </div>
    </section>
  );
}

// Shared save state for both small forms.
function useSave() {
  const [message, setMessage] = useState<string>();
  const [saving, setSaving] = useState(false);
  // fallback: the message when the request itself fails, for example with no signal.
  async function run(save: () => Promise<SaveDailyActivityResult>, fallback: string) {
    setSaving(true);
    setMessage(undefined);
    const result = await save().catch((): SaveDailyActivityResult => ({ ok: false, error: fallback }));
    setSaving(false);
    setMessage(result.ok ? SAVED : result.error);
  }
  return { message, saving, run };
}

function Message({ message }: { message?: string }) {
  return <div aria-live="polite">{message && <p className={message === SAVED ? "alert-success" : "alert-danger"}>{message}</p>}</div>;
}

function SaveButton({ saving }: { saving: boolean }) {
  return (
    <button className="btn-primary btn-sm w-fit disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function StepsForm({ initial }: { initial: string }) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const { message, saving, run } = useSave();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() => saveStepsAction(localToday(), value), "Your steps could not be saved. Please try again.");
  }

  return (
    <form aria-labelledby={`${id}-label`} className="grid gap-3" onSubmit={submit}>
      <label className="grid min-w-0 gap-1 text-sm font-semibold" htmlFor={`${id}-steps`} id={`${id}-label`}>Steps today</label>
      <input
        autoComplete="off"
        className="field w-full min-w-0"
        id={`${id}-steps`}
        inputMode="numeric"
        name="steps"
        onChange={(event) => setValue(event.target.value)}
        type="text"
        value={value}
      />
      <Message message={message} />
      <SaveButton saving={saving} />
    </form>
  );
}

function SleepForm({ initial }: { initial: { hours: string; minutes: string } }) {
  const id = useId();
  const [fields, setFields] = useState(initial);
  const { message, saving, run } = useSave();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(() => saveSleepAction(localToday(), fields.hours, fields.minutes), "Your sleep could not be saved. Please try again.");
  }

  return (
    <form aria-labelledby={`${id}-legend`} className="grid gap-3" onSubmit={submit}>
      <fieldset className="grid gap-1">
        <legend className="text-sm font-semibold" id={`${id}-legend`}>Sleep last night</legend>
        <div className="mt-1 grid grid-cols-2 gap-3">
          <label className="grid min-w-0 gap-1 text-sm text-muted">
            Hours
            <input
              autoComplete="off"
              className="field w-full min-w-0"
              inputMode="numeric"
              name="sleep-hours"
              onChange={(event) => setFields((current) => ({ ...current, hours: event.target.value }))}
              type="text"
              value={fields.hours}
            />
          </label>
          <label className="grid min-w-0 gap-1 text-sm text-muted">
            Minutes
            <input
              autoComplete="off"
              className="field w-full min-w-0"
              inputMode="numeric"
              name="sleep-minutes"
              onChange={(event) => setFields((current) => ({ ...current, minutes: event.target.value }))}
              type="text"
              value={fields.minutes}
            />
          </label>
        </div>
      </fieldset>
      <Message message={message} />
      <SaveButton saving={saving} />
    </form>
  );
}
