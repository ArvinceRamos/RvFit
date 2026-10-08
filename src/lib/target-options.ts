import type { GoalInput, PaceInput } from "@/lib/calc/calculate";
import type { ActivityLevel } from "@/lib/calc/config";

// Shared by the guest calculator and Profile and targets. Copy is a placeholder pending reviewer approval.
export const activityOptions: { value: ActivityLevel; title: string; detail: string }[] = [
  { value: "sedentary", title: "Sedentary", detail: "Mostly sitting; little planned exercise." },
  { value: "light", title: "Light", detail: "Easy activity or exercise 1–3 days a week." },
  { value: "moderate", title: "Moderate", detail: "Exercise or active work most days of the week." },
  { value: "very_active", title: "Very active", detail: "Hard exercise 6–7 days a week." },
  { value: "extra_active", title: "Extra active", detail: "Very demanding training or a physical job plus training." },
];

export const goalOptions: { value: GoalInput; title: string; detail: string }[] = [
  { value: "lose", title: "Lose weight", detail: "Lose fat. Pick Slow to keep more muscle, or Faster if you mainly care about the scale." },
  {
    value: "maintain",
    title: "Maintain",
    detail: "Stay about the same weight. Good for toning up: lose a little fat and build a little muscle slowly.",
  },
  { value: "gain", title: "Gain weight", detail: "Build muscle. Pick Slow for less fat gain, or Faster if you mainly want to gain weight." },
];

// Pace choices for losing or gaining. Stored as "gradual" (Slow) and "steady" (Faster).
// Weekly amounts are rough estimates of the configured daily adjustments; real progress usually slows over time.
export const paceOptions: Record<"lose" | "gain", { value: PaceInput; title: string; detail: string }[]> = {
  lose: [
    { value: "gradual", title: "Slow", detail: "Easier to stick to and keeps more muscle. About 0.25 kg a week." },
    { value: "steady", title: "Faster", detail: "More effort. About 0.5 kg a week." },
  ],
  gain: [
    { value: "gradual", title: "Slow", detail: "Less fat gain. About 0.1 kg a week." },
    { value: "steady", title: "Faster", detail: "About 0.2 kg a week; a bit more fat." },
  ],
};

/** Short goal and pace context, such as "Lose weight · Slow pace". null when there is no goal (a manual target). */
export function goalPaceLabel(goal: GoalInput | null | undefined, pace: PaceInput | null | undefined): string | null {
  const goalTitle = goalOptions.find((option) => option.value === goal)?.title;
  if (!goalTitle) return null;
  if (goal === "maintain") return goalTitle;
  const paceTitle = paceOptions[goal as "lose" | "gain"].find((option) => option.value === pace)?.title;
  return paceTitle ? `${goalTitle} · ${paceTitle} pace` : goalTitle;
}
