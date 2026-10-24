"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptCheckInAction } from "@/app/profile/actions";
import { calculationConfig } from "@/lib/calc/config";
import type { CheckIn } from "@/lib/check-in";
import { formatKcal, formatWeeklyRate } from "@/lib/remaining-format";
import type { PreferredUnits } from "@/lib/weigh-in";

// Target check-in on Profile, Progress and the Dashboard. It only suggests: a new target is saved
// only when the user presses "Use … kcal", and that save keeps the goal, pace and macro split.

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

// The Use button. The server works the suggestion out again before saving it.
function AcceptSuggestion({ kcal, onSaved }: { kcal: number; onSaved: (kcal: number) => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function accept() {
    if (saving) return;
    setSaving(true);
    setError(undefined);
    const result = await acceptCheckInAction(kcal).catch(() => ({ ok: false as const, error: "Your target could not be saved. Please try again." }));
    setSaving(false);
    if (result.ok) onSaved(result.kcal);
    else setError(result.error);
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button className="btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} onClick={accept} type="button">
          {saving ? "Saving…" : `Use ${formatKcal(kcal)}`}
        </button>
        <span className="text-xs text-muted">Saves a new target. Your goal, pace and macro split stay the same.</span>
      </div>
      {error && <p className="alert-danger mt-3" role="alert">{error}</p>}
    </>
  );
}

export function CheckInCard({ checkIn, units, className = "mt-8", onSaved }: { checkIn: CheckIn; units: PreferredUnits; className?: string; onSaved?: () => void }) {
  const router = useRouter();
  // Kept after the save, so the confirmation stays while the page loads the new target.
  const [savedKcal, setSavedKcal] = useState<number>();
  if (checkIn.status === "no_goal" && savedKcal === undefined) return null;
  const { window_days, settle_days, min_weigh_in_days, min_span_days } = calculationConfig.check_in;

  function saved(kcal: number) {
    setSavedKcal(kcal);
    router.refresh();
    onSaved?.();
  }

  let body: React.ReactNode;
  if (savedKcal !== undefined) {
    body = (
      <p className="alert-success mt-3" role="status">
        New target saved: {formatKcal(savedKcal)} a day. Your goal, pace and macro split stay the same. The next check-in starts
        from today, so give it about {settle_days + min_span_days} days of weigh-ins.
      </p>
    );
  } else if (checkIn.status === "no_goal") {
    body = null;
  } else if (checkIn.status === "not_enough_data") {
    body = (
      <p className="mt-2 text-sm text-muted">
        It needs weigh-ins on at least {min_weigh_in_days} different
        days in the last {window_days} days, spread over at least {min_span_days} days. The first {settle_days} days after a new
        target are skipped, because they are the noisiest.{" "}
        {checkIn.availableFrom
          ? `The earliest check-in is ${dateFormat.format(new Date(checkIn.availableFrom))}.`
          : `So far you have ${checkIn.weighInDays} ${checkIn.weighInDays === 1 ? "day" : "days"} with a weigh-in, over ${checkIn.spanDays} ${checkIn.spanDays === 1 ? "day" : "days"}.`}{" "}
        <Link className="font-semibold text-ink underline" href="/progress">Log a weigh-in</Link>
      </p>
    );
  } else {
    const trend = (
      <p className="mt-2 text-sm text-muted">
        Over your last {window_days} days, your weight trend is about <span className="font-semibold text-ink">{formatWeeklyRate(checkIn.observedKgPerWeek, units)}</span>.
        Your {checkIn.expectedKgPerWeek === 0 ? "goal" : "pace"} aims for about <span className="font-semibold text-ink">{formatWeeklyRate(checkIn.expectedKgPerWeek, units)}</span>.
      </p>
    );
    if (checkIn.status === "on_track") {
      body = (
        <>
          {trend}
          <p className="alert-success mt-3">That is close to your plan. No change needed. Keep going.</p>
        </>
      );
    } else if (checkIn.status === "holding") {
      body = (
        <>
          {trend}
          <p className="alert-warn mt-3">
            Holding: not enough data to tell yet. Your weigh-ins move around more than the gap from your plan, so RvFit is not
            suggesting a change. Keep your target and keep weighing in; more weigh-ins make the trend clearer.
          </p>
        </>
      );
    } else if (checkIn.status === "at_floor") {
      body = (
        <>
          {trend}
          <p className="alert-warn mt-3">
            Your target is already at the minimum of {checkIn.floorKcal.toLocaleString("en-US")} kcal, so RvFit will not suggest eating less.
            A little more daily activity can help, or talk to a doctor or dietitian.
          </p>
        </>
      );
    } else {
      const sign = checkIn.changeKcal > 0 ? "+" : "−";
      body = (
        <>
          {trend}
          <div className="tile mt-3 p-4">
            <p className="font-semibold">
              Suggestion: about {formatKcal(checkIn.suggestedKcal)} a day (about {sign}{Math.round(Math.abs(checkIn.changeKcal) / 10) * 10} kcal)
            </p>
            <p className="mt-1 text-sm text-muted">
              {checkIn.changeKcal < 0 ? "A little less food should move your trend toward your plan." : "A little more food should slow things to a steadier pace."}{" "}
              Daily weight swings with water and food, so give any change 2–3 weeks before judging it.
            </p>
            <AcceptSuggestion kcal={checkIn.suggestedKcal} onSaved={saved} />
            <p className="mt-3 text-xs text-muted">
              Prefer another number? <Link className="font-semibold text-ink underline" href="/profile#update-target">Change your target in Profile</Link>.
            </p>
          </div>
        </>
      );
    }
  }

  return (
    <section aria-labelledby="check-in-title" className={`card ${className}`}>
      <h2 className="section-title" id="check-in-title">Target check-in</h2>
      <p className="mt-1 text-sm text-muted">Every few weeks, RvFit compares your weight trend with the pace you chose and may suggest a small calorie change.</p>
      {body}
    </section>
  );
}
