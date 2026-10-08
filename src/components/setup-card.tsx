"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { setupComplete, setupSteps, type SetupFlags } from "@/lib/setup-steps";

// Hiding is a per-browser convenience. The card also disappears for good once every step is done.
const hiddenKey = "rvfit-setup-hidden";
const hiddenEvent = "rvfit-setup-hidden-changed";

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(hiddenKey) === "1";
  } catch {
    return false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(hiddenEvent, onChange);
  return () => window.removeEventListener(hiddenEvent, onChange);
}

function setHidden(value: boolean) {
  try {
    if (value) window.localStorage.setItem(hiddenKey, "1");
    else window.localStorage.removeItem(hiddenKey);
  } catch {
    // Storage can be blocked; the card simply stays visible.
  }
  window.dispatchEvent(new Event(hiddenEvent));
}

export function SetupCard({ flags }: { flags: SetupFlags }) {
  // Server render and first paint treat the card as hidden, so it never flashes before storage is read.
  const hidden = useSyncExternalStore(subscribe, readHidden, () => true);
  if (setupComplete(flags) || hidden) return null;

  const steps = setupSteps(flags);
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  return (
    <section aria-labelledby="setup-title" className="card md:col-span-2 lg:col-span-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-medium" id="setup-title">Get set up</h2>
        <p className="text-sm text-muted">{doneCount} of {steps.length} done</p>
      </div>
      <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-track">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li
            className={`rounded-xl border p-3 ${step === next ? "border-selected-edge bg-selected" : "border-line"}`}
            key={step.key}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span
                aria-hidden
                className={`grid size-5 shrink-0 place-items-center rounded-full text-xs ${step.done ? "bg-accent text-on-accent" : "border border-edge text-muted"}`}
              >
                {step.done ? "✓" : index + 1}
              </span>
              <span className={step.done ? "text-muted line-through" : ""}>{step.title}</span>
              <span className="sr-only">{step.done ? "(done)" : "(not done yet)"}</span>
            </p>
            {!step.done && (
              <>
                <p className="mt-1 text-sm text-muted">{step.detail}</p>
                <Link className={`mt-3 ${step === next ? "btn-primary" : "btn-secondary"}`} href={step.href}>{step.action}</Link>
              </>
            )}
          </li>
        ))}
      </ol>
      <button className="mt-3 text-sm font-semibold text-muted underline hover:text-ink" onClick={() => setHidden(true)} type="button">
        Hide these steps
      </button>
    </section>
  );
}
