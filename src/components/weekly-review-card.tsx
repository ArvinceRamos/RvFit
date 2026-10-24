import Link from "next/link";
import { Icon } from "@/components/icon";
import { calculationConfig } from "@/lib/calc/config";
import { checkInReady, type CheckIn } from "@/lib/check-in";
import { formatKcal, formatWeeklyRate } from "@/lib/remaining-format";
import type { PreferredUnits } from "@/lib/weigh-in";
import { REVIEW_DAYS, type WeeklyReview } from "@/lib/weekly-review";

// The weekly review on the Dashboard: the last 7 days in plain numbers. No streaks and no scores.

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function Tile({ label, value, note }: { label: string; value: string; note: React.ReactNode }) {
  return (
    <div className="tile p-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{value}</dd>
      <dd className="mt-1 text-xs text-muted">{note}</dd>
    </div>
  );
}

export function WeeklyReviewCard({
  review,
  targetKcal,
  units,
  checkIn,
  className = "",
}: {
  review: WeeklyReview;
  targetKcal: number | null;
  units: PreferredUnits;
  checkIn: CheckIn | null;
  className?: string;
}) {
  const rate = review.weightChangeKg === null ? null : formatWeeklyRate(review.weightChangeKg, units);
  return (
    <section aria-labelledby="weekly-review-title" className={`card ${className}`}>
      <h2 className="section-title flex items-center gap-2" id="weekly-review-title">
        <Icon className="size-5 text-accent-text" name="week" />Last {REVIEW_DAYS} days
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Days logged" note="Days with a meal ticked as eaten" value={`${review.daysLogged} of ${REVIEW_DAYS}`} />
        <Tile
          label="Workouts"
          note={review.plannedWorkouts !== null
            ? "Against your training days a week"
            : <Link className="font-semibold text-ink underline" href="/preferences">Set training days</Link>}
          value={review.plannedWorkouts !== null ? `${review.workouts} of ${review.plannedWorkouts}` : String(review.workouts)}
        />
        <Tile
          label="Average intake"
          note={targetKcal !== null ? `On logged days · target ${formatKcal(targetKcal)}` : "On logged days"}
          value={review.averageKcal !== null ? formatKcal(review.averageKcal) : "—"}
        />
        <Tile
          label="Weekly average weight"
          note={rate !== null
            ? "Change from the week before"
            : `Needs ${calculationConfig.progress.trend_min_weigh_ins} weigh-ins in each of the last two weeks`}
          value={rate === null ? "—" : /^[+−]/.test(rate) ? rate : "No change"}
        />
      </dl>
      {checkIn && checkIn.status !== "no_goal" && (
        <p className="mt-3 text-sm text-muted">
          Target check-in:{" "}
          {checkInReady(checkIn) ? (
            <span className="font-semibold text-ink">ready, see it below.</span>
          ) : checkIn.status === "not_enough_data" && checkIn.availableFrom ? (
            `not ready yet. The earliest is ${dateFormat.format(new Date(checkIn.availableFrom))}.`
          ) : (
            <>not ready yet. It needs more weigh-ins. <Link className="font-semibold text-ink underline" href="/progress">Log a weigh-in</Link></>
          )}
        </p>
      )}
    </section>
  );
}
