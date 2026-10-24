import Link from "next/link";
import { AccountCard } from "@/components/account-card";
import { AuthFrame } from "@/components/auth-frame";
import { CheckInCard } from "@/components/check-in-card";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { ProfileForm, type SavedProfile, type CurrentTarget } from "@/components/profile-form";
import { type ActivityLevel, type FormulaBranch } from "@/lib/calc/config";
import { loadCheckInData } from "@/lib/check-in-data";
import { savedDisplayName } from "@/lib/display-name";
import { requireUser } from "@/lib/supabase/auth";

// Loads everything Profile needs in parallel. "now" is read here, outside the component, so rendering stays pure.
async function loadProfileData(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  const now = Date.now();
  return Promise.all([
    supabase.from("profiles").select("age_years, sex_formula_branch, height_cm, activity_level, preferred_units").maybeSingle(),
    supabase
      .from("calorie_targets")
      .select("source, target_kcal, goal, pace, protein_g, carbs_g, fat_g, fiber_g, calculation_inputs, created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("body_logs").select("weight_kg").not("weight_kg", "is", null).order("logged_at", { ascending: false }).limit(1),
    loadCheckInData(supabase, now),
  ]);
}

export default async function ProfilePage() {
  const { supabase, user } = await requireUser();

  const [
    { data: profile, error: profileError },
    { data: targets, error: targetError },
    { data: weighIns, error: weightError },
    checkInData,
  ] = await loadProfileData(supabase);

  let body: React.ReactNode;
  if (profileError || targetError || weightError || checkInData === "error") {
    body = <p className="alert-danger mt-6" role="alert">Your profile could not be loaded. Please try again.</p>;
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
    const inputs = row?.calculation_inputs as Record<string, unknown> | null | undefined;
    const current: CurrentTarget | null = row
      ? {
          source: row.source as "calculated" | "manual",
          fromCheckIn: Boolean(inputs && typeof inputs === "object" && "check_in" in inputs),
          kcal: Number(row.target_kcal),
          goal: (row.goal as CurrentTarget["goal"]) ?? null,
          pace: (row.pace as CurrentTarget["pace"]) ?? null,
          macros: { protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) },
          created_at: row.created_at as string,
        }
      : null;
    const latestWeightKg = weighIns?.[0] ? Number(weighIns[0].weight_kg) : null;
    body = (
      <>
        {checkInData && <CheckInCard checkIn={checkInData.checkIn} units={saved.units} />}
        <ProfileForm current={current} latestWeightKg={latestWeightKg} profile={saved} />
      </>
    );
  }

  return (
    <AuthFrame showNav>
      <h1 className="page-title">Profile and targets</h1>
      <p className="mt-3 text-sm text-muted">
        Food settings (allergies and avoided foods) and your training plan are in{" "}
        <Link className="font-semibold text-ink underline" href="/preferences">Preferences</Link>.
      </p>
      {body}
      <AccountCard email={user.email ?? ""} name={savedDisplayName(user.user_metadata)} />
      <DeleteAccountSection />
    </AuthFrame>
  );
}
