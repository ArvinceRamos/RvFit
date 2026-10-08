import Link from "next/link";
import { AuthFrame } from "@/components/auth-frame";
import { CheckInCard } from "@/components/check-in-card";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { ProfileForm, type SavedProfile, type CurrentTarget } from "@/components/profile-form";
import { calculationConfig, type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import { targetCheckIn, type CheckInGoal, type CheckInPace } from "@/lib/check-in";
import { requireUser } from "@/lib/supabase/auth";

// Enough history for the check-in's two weeks plus the gap between them.
const checkInHistoryDays = calculationConfig.check_in.window_days * 2 + calculationConfig.check_in.compare_gap_days;
// Recent targets, so a manual target can still use the goal and pace of the last calculated one.
const recentTargets = 10;

// Loads everything Profile needs in parallel. "now" is read here, outside the component, so rendering stays pure.
async function loadProfileData(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  const now = Date.now();
  const since = new Date(now - checkInHistoryDays * 24 * 60 * 60 * 1000).toISOString();
  const results = await Promise.all([
    supabase.from("profiles").select("age_years, sex_formula_branch, height_cm, activity_level, preferred_units").maybeSingle(),
    supabase
      .from("calorie_targets")
      .select("source, target_kcal, goal, pace, protein_g, carbs_g, fat_g, fiber_g, floor_applied, created_at")
      .order("created_at", { ascending: false })
      .limit(recentTargets),
    supabase.from("body_logs").select("weight_kg").not("weight_kg", "is", null).order("logged_at", { ascending: false }).limit(1),
    supabase.from("body_logs").select("weight_kg, logged_at").not("weight_kg", "is", null).gte("logged_at", since),
  ]);
  return { now, results };
}

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { supabase } = await requireUser();
  // Set by the check-in's "Use this target" link: it pre-fills the form, it does not save.
  const suggestParam = Number((await searchParams).suggest);

  const { now, results } = await loadProfileData(supabase);
  const [
    { data: profile, error: profileError },
    { data: targets, error: targetError },
    { data: weighIns, error: weightError },
    { data: recentWeighIns, error: recentError },
  ] = results;

  let body: React.ReactNode;
  if (profileError || targetError || weightError || recentError) {
    body = <p className="mt-6 text-sm text-danger">Your profile could not be loaded. Please try again.</p>;
  } else if (!profile) {
    // The profile and its age confirmation are created when the first target is saved.
    body = (
      <p className="mt-6 text-sm text-muted">
        You do not have a saved target yet. <Link className="font-semibold text-ink underline" href="/start">Set up a target</Link>, then press Save to my account.
      </p>
    );
  } else {
    const saved: SavedProfile = {
      age_years: profile.age_years === null ? null : Number(profile.age_years),
      sex: (profile.sex_formula_branch as FormulaBranch | null) ?? null,
      height_cm: profile.height_cm === null ? null : Number(profile.height_cm),
      activity: (profile.activity_level as ActivityLevel | null) ?? null,
      units: profile.preferred_units === "imperial" ? "imperial" : "metric",
    };
    const row = targets?.[0];
    const current: CurrentTarget | null = row
      ? {
          source: row.source as "calculated" | "manual",
          kcal: Number(row.target_kcal),
          goal: (row.goal as CurrentTarget["goal"]) ?? null,
          pace: (row.pace as CurrentTarget["pace"]) ?? null,
          macros: { protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) },
          created_at: row.created_at as string,
        }
      : null;
    const latestWeightKg = weighIns?.[0] ? Number(weighIns[0].weight_kg) : null;
    const withGoal = targets?.find((target) => target.goal);
    const checkIn = row
      ? targetCheckIn({
          targetKcal: Number(row.target_kcal),
          targetSetAt: new Date(row.created_at as string).getTime(),
          goal: (withGoal?.goal as CheckInGoal | undefined) ?? null,
          pace: (withGoal?.pace as CheckInPace | null | undefined) ?? null,
          floorApplied: Boolean(row.floor_applied),
          branch: saved.sex,
          weighIns: (recentWeighIns ?? []).map((item) => ({ time: new Date(item.logged_at as string).getTime(), kg: Number(item.weight_kg) })),
          now,
        })
      : null;
    const suggestedKcal = Number.isInteger(suggestParam) && suggestParam > 0 ? suggestParam : null;
    body = (
      <>
        {checkIn && <CheckInCard checkIn={checkIn} units={saved.units} />}
        {/* Keyed so following a check-in link starts the form fresh with the suggestion. */}
        <ProfileForm current={current} key={suggestedKcal ?? "current"} latestWeightKg={latestWeightKg} profile={saved} suggestedKcal={suggestedKcal} />
      </>
    );
  }

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Profile and targets</h1>
      {body}
      <DeleteAccountSection />
    </AuthFrame>
  );
}
