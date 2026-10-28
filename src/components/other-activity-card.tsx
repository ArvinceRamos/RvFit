"use client";

import { useId, useState } from "react";
import { addActivityAction, type ActivityLogResult } from "@/app/dashboard/actions";
import { DeleteActivityButton } from "@/components/delete-activity-button";
import { Icon } from "@/components/icon";
import { localToday } from "@/components/today-summary";
import { calculationConfig } from "@/lib/calc/config";
import type { ActivityEntry } from "@/lib/dashboard-data";

const activities = calculationConfig.activity.other_activities;

function activityLabel(key: string): string {
  return activities.find((activity) => activity.key === key)?.label ?? key;
}

// Add an Other activity on today's local date, and list today's entries with Delete. Each save or delete
// re-renders Today, so the list and the Burned today card's Other activity tile update. No walking: steps count it.
export function OtherActivityCard({ entries, className = "" }: { entries: ActivityEntry[]; className?: string }) {
  return (
    <section className={`card ${className}`}>
      <h2 className="section-title flex items-center gap-2"><Icon className="size-5 text-accent-text" name="workouts" />Other activity</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <AddActivityForm />
        <div>
          <h3 className="text-sm font-semibold">Today</h3>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No activity added today.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {entries.map((entry) => (
                <li className="flex items-start justify-between gap-3 text-sm" key={entry.id}>
                  <span><span className="font-bold">{activityLabel(entry.activity_key)}</span> <span className="text-muted">· {entry.minutes} min</span></span>
                  <DeleteActivityButton activityId={entry.id} label={activityLabel(entry.activity_key)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function AddActivityForm() {
  const id = useId();
  const [key, setKey] = useState<string>(activities[0].key);
  const [minutes, setMinutes] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(undefined);
    const result = await addActivityAction(localToday(), key, minutes).catch(
      (): ActivityLogResult => ({ ok: false, error: "Your activity could not be saved. Please try again." }),
    );
    setSaving(false);
    if (result.ok) setMinutes("");
    setMessage({ ok: result.ok, text: result.ok ? "Saved." : result.error });
  }

  return (
    <form aria-label="Add activity" className="grid content-start gap-3" onSubmit={submit}>
      <label className="grid min-w-0 gap-1 text-sm font-semibold" htmlFor={`${id}-activity`}>Activity</label>
      <select className="field w-full min-w-0" id={`${id}-activity`} name="activity" onChange={(event) => setKey(event.target.value)} value={key}>
        {activities.map((activity) => <option key={activity.key} value={activity.key}>{activity.label}</option>)}
      </select>
      <label className="grid min-w-0 gap-1 text-sm font-semibold" htmlFor={`${id}-minutes`}>Minutes</label>
      <input
        autoComplete="off"
        className="field w-full min-w-0"
        id={`${id}-minutes`}
        inputMode="numeric"
        name="minutes"
        onChange={(event) => setMinutes(event.target.value)}
        type="text"
        value={minutes}
      />
      <div aria-live="polite">{message && <p className={message.ok ? "alert-success" : "alert-danger"}>{message.text}</p>}</div>
      <button className="btn-primary btn-sm w-fit disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} type="submit">
        {saving ? "Saving…" : "Add activity"}
      </button>
    </form>
  );
}
