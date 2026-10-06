import type { GoalInput } from "@/lib/calc/calculate";
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
  { value: "lose", title: "Lose weight", detail: "Mostly want to lose weight." },
  {
    value: "maintain",
    title: "Maintain",
    detail: "Keep my weight steady. Also a common choice if you want to lose fat and build muscle slowly. Progress is slower.",
  },
  { value: "gain", title: "Gain weight", detail: "Mostly want to build muscle or gain weight." },
];
