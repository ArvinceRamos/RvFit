import { hasRestingDetails, restingPerDay, type ActivityBurnInput, type BurnedTodayInput, type RestingProfile, type WorkoutBurnInput } from "./burn";

// Maps the database rows Today reads into the Burned today card's input. Only the minutes since local
// midnight are missing: the browser adds them (see BurnedTodayCard). Kept free of Next and the DOM so it can be tested.

// PostgREST can return numeric columns as strings, so every number is read with Number().
type Numberish = number | string | null | undefined;

export type ProfileDetailsRow = { age_years?: Numberish; height_cm?: Numberish; sex_formula_branch?: string | null } | null;
export type DailyActivityRow = { steps?: Numberish; sleep_minutes?: Numberish } | null;
export type ActivityLogRow = { activity_key: string; minutes: Numberish };
export type WorkoutRow = { duration_min?: Numberish; set_count: number };

export type TodayBurnBase = Omit<BurnedTodayInput, "minutesSinceMidnight"> & {
  /** False when height, age or sex is missing, so the card asks for them in Profile. */
  hasDetails: boolean;
};

function toNumber(value: Numberish): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function restingProfile(row: ProfileDetailsRow): RestingProfile {
  const sex = row?.sex_formula_branch;
  return {
    age_years: toNumber(row?.age_years),
    height_cm: toNumber(row?.height_cm),
    sex_formula_branch: sex === "male" || sex === "female" ? sex : null,
  };
}

export function todayBurnInput(rows: {
  profile: ProfileDetailsRow;
  /** The latest weigh-in's weight; null when there is none. */
  weightKg: Numberish;
  workouts: readonly WorkoutRow[];
  daily: DailyActivityRow;
  activities: readonly ActivityLogRow[];
}): TodayBurnBase {
  const profile = restingProfile(rows.profile);
  const weightKg = toNumber(rows.weightKg);
  const workouts: WorkoutBurnInput[] = rows.workouts.map((workout) => ({
    duration_min: toNumber(workout.duration_min),
    set_count: workout.set_count,
  }));
  const activities: ActivityBurnInput[] = rows.activities.map((activity) => ({
    activity_key: activity.activity_key,
    minutes: toNumber(activity.minutes) ?? 0,
  }));
  return {
    hasDetails: hasRestingDetails(profile),
    restingPerDay: restingPerDay(profile, weightKg),
    weightKg,
    workouts,
    steps: toNumber(rows.daily?.steps),
    activities,
  };
}
