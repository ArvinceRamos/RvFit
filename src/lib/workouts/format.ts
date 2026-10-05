import { equipmentLabels, experienceLabels, type Equipment, type Experience } from "@/lib/preferences";
import type { Exercise, Scheme } from "./types";

// Example: "Beginner · 3 days a week · Dumbbells only"
export function planSummary(level: Experience, days: number, equipment: Equipment): string {
  return `${experienceLabels[level]} · ${days} days a week · ${equipmentLabels[equipment]}`;
}

// Example: "3 sets × 8–12 reps" or "2 sets × 20–40 seconds"
export function schemeText(scheme: Scheme, exercise: Pick<Exercise, "measure">): string {
  const unit = exercise.measure === "seconds" ? "seconds" : "reps";
  return `${scheme.sets} sets × ${scheme.reps.min}–${scheme.reps.max} ${unit}`;
}

const equipmentShortLabels: Record<Equipment, string> = {
  bodyweight: "bodyweight",
  dumbbell_only: "dumbbells",
  gym: "gym",
};

// Example: "Goblet squat (dumbbells)". Shows what each swap needs, for days a machine is not free.
export function choiceLabel(exercise: Pick<Exercise, "name" | "equipment">): string {
  return `${exercise.name} (${equipmentShortLabels[exercise.equipment]})`;
}

// Workout dates are plain calendar dates, so format the parts directly to avoid time zone shifts.
export function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export function restText(scheme: Scheme): string {
  return `Rest ${scheme.restSeconds} s`;
}
