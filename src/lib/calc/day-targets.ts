// Rest-day calories (docs/SPLITS-AND-CALORIES.md). The saved target never changes: this only spreads it over
// the suggested Monday-to-Sunday week, so the 7 days always add up to 7 × the saved kcal.
import { calculationConfig } from "@/lib/calc/config";
import type { DailyTargets } from "@/lib/suggestions";
import { isoWeekday, trainingWeekdays } from "@/lib/workouts/schedule";

const settings = calculationConfig.rest_day_calories;
// Rest days never go below the lowest calorie floor (the manual-target floor).
const lowestFloor = Math.min(...Object.values(calculationConfig.formula_branch_floors_kcal));
const kcalPerCarbGram = calculationConfig.macros.kcal_per_gram.carbohydrate;

export type DayType = "training" | "rest";
export type DayTarget = DailyTargets & { day_type: DayType | null };

/**
 * Whole kcal for each ISO weekday, Monday first. Null when the week has no rest days or no training days
 * (every day is then the saved target). The last training days take any rounding, so the sum is exact.
 */
export function weeklyCalories(targetKcal: number, trainingDays: number | null): number[] | null {
  const weekdays = trainingDays ? trainingWeekdays(trainingDays) : [];
  const training = weekdays.length;
  const rest = 7 - training;
  if (training === 0 || rest === 0) return null;
  const target = Math.round(targetKcal);
  const total = 7 * target;

  let restKcal = target * (1 - settings.rest_day_cut_fraction);
  let trainingKcal = (total - rest * restKcal) / training;
  const maxTraining = target * (1 + settings.max_training_day_raise_fraction);
  if (trainingKcal > maxTraining) {
    trainingKcal = maxTraining;
    restKcal = (total - training * trainingKcal) / rest;
  }
  // Never below the floor; a target at or under the floor stays flat.
  if (restKcal < lowestFloor) restKcal = Math.min(target, lowestFloor);

  const restWhole = Math.round(restKcal);
  const trainingTotal = total - rest * restWhole;
  const trainingWhole = Math.floor(trainingTotal / training);
  const extra = trainingTotal - training * trainingWhole;
  return Array.from({ length: 7 }, (_, index) => {
    const position = weekdays.indexOf(index + 1);
    if (position === -1) return restWhole;
    return trainingWhole + (position >= training - extra ? 1 : 0);
  });
}

/** The target for one calendar date. Protein, fat and fiber stay the same; carbohydrate grams take the change. */
export function targetForDate(targets: DailyTargets, date: string, trainingDays: number | null): DayTarget {
  const week = weeklyCalories(targets.kcal, trainingDays);
  if (!week) return { ...targets, day_type: null };
  const weekday = isoWeekday(date);
  const kcal = week[weekday - 1];
  const dayType: DayType = trainingWeekdays(trainingDays ?? 0).includes(weekday) ? "training" : "rest";
  const carbs = Math.max(0, Math.round(targets.carbs_g + (kcal - Math.round(targets.kcal)) / kcalPerCarbGram));
  return { ...targets, kcal, carbs_g: carbs, day_type: dayType };
}

export const dayTypeLabel: Record<DayType, string> = { training: "Training day", rest: "Rest day" };
export const restDayNote = "Rest days get a little less, training days a little more. Your weekly total stays the same.";
