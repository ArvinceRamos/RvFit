import type { DefaultMacros } from "@/lib/calc/calculate";
import type { FormulaBranch } from "@/lib/calc/config";
import { checkInHistoryDays, targetCheckIn, type CheckIn, type CheckInGoal, type CheckInPace } from "@/lib/check-in";
import type { createClient } from "@/lib/supabase/server";
import type { PreferredUnits } from "@/lib/weigh-in";

// Loads the target check-in for Profile, Progress, the Dashboard and the accept action, so all four
// read the same rows the same way. Reads as the signed-in user, so row-level security applies.
type Client = Awaited<ReturnType<typeof createClient>>;

// Recent targets, so a manual target can still use the goal and pace of the last calculated one.
const recentTargets = 10;

export type CheckInData = {
  checkIn: CheckIn;
  units: PreferredUnits;
  current: { kcal: number; macros: DefaultMacros };
  goal: CheckInGoal | null;
  pace: CheckInPace | null;
  branch: FormulaBranch | null;
};

// Null when there is no saved target yet. "error" when something could not be read.
export async function loadCheckInData(supabase: Client, now: number): Promise<CheckInData | null | "error"> {
  const since = new Date(now - checkInHistoryDays * 24 * 60 * 60 * 1000).toISOString();
  const [profile, targets, weighIns] = await Promise.all([
    supabase.from("profiles").select("sex_formula_branch, preferred_units").maybeSingle(),
    supabase
      .from("calorie_targets")
      .select("target_kcal, goal, pace, protein_g, carbs_g, fat_g, fiber_g, floor_applied, created_at")
      .order("created_at", { ascending: false })
      .limit(recentTargets),
    supabase.from("body_logs").select("weight_kg, logged_at").not("weight_kg", "is", null).gte("logged_at", since),
  ]);
  if (profile.error || targets.error || weighIns.error) return "error";
  const row = targets.data?.[0];
  if (!row) return null;

  const withGoal = targets.data?.find((target) => target.goal);
  const goal = (withGoal?.goal as CheckInGoal | undefined) ?? null;
  const pace = (withGoal?.pace as CheckInPace | null | undefined) ?? null;
  const branch = (profile.data?.sex_formula_branch as FormulaBranch | null | undefined) ?? null;
  const kcal = Number(row.target_kcal);
  return {
    checkIn: targetCheckIn({
      targetKcal: kcal,
      targetSetAt: new Date(row.created_at as string).getTime(),
      goal,
      pace,
      floorApplied: Boolean(row.floor_applied),
      branch,
      weighIns: (weighIns.data ?? []).map((item) => ({ time: new Date(item.logged_at as string).getTime(), kg: Number(item.weight_kg) })),
      now,
    }),
    units: profile.data?.preferred_units === "imperial" ? "imperial" : "metric",
    current: {
      kcal,
      macros: { protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) },
    },
    goal,
    pace,
    branch,
  };
}
