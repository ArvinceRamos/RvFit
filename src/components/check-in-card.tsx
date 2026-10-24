import Link from "next/link";
import { calculationConfig } from "@/lib/calc/config";
import type { CheckIn } from "@/lib/check-in";
import { formatWeeklyRate } from "@/lib/remaining-format";
import type { PreferredUnits } from "@/lib/weigh-in";

// Target check-in on Profile and targets. Advice only: "Use this target" pre-fills the form below,
// and nothing changes until the user presses Save there.

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function CheckInCard({ checkIn, units }: { checkIn: CheckIn; units: PreferredUnits }) {
  if (checkIn.status === "no_goal") return null;
  const { window_days, settle_days, min_weigh_in_days, min_span_days } = calculationConfig.check_in;

  let body: React.ReactNode;
  if (checkIn.status === "not_enough_data") {
    body = (
      <p className="mt-2 text-sm text-muted">
        This compares your weight trend with the pace you chose. It needs weigh-ins on at least {min_weigh_in_days} different
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
              Suggestion: about {checkIn.suggestedKcal.toLocaleString("en-US")} kcal a day (about {sign}{Math.round(Math.abs(checkIn.changeKcal) / 10) * 10} kcal)
            </p>
            <p className="mt-1 text-sm text-muted">
              {checkIn.changeKcal < 0 ? "A little less food should move your trend toward your plan." : "A little more food should slow things to a steadier pace."}{" "}
              Daily weight swings with water and food, so give any change 2–3 weeks before judging it.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link className="btn-primary btn-sm" href={`/profile?suggest=${checkIn.suggestedKcal}#update-target`}>
                Use {checkIn.suggestedKcal.toLocaleString("en-US")} kcal
              </Link>
              <span className="text-xs text-muted">Fills in the form below. Nothing changes until you press Save.</span>
            </div>
          </div>
        </>
      );
    }
  }

  return (
    <section aria-labelledby="check-in-title" className="card mt-8">
      <h2 className="section-title" id="check-in-title">Target check-in</h2>
      {body}
    </section>
  );
}
