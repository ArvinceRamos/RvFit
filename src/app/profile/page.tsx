import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { DeleteAccountSection } from "@/components/delete-account-section";
import { ProfileForm, type SavedProfile, type CurrentTarget } from "@/components/profile-form";
import type { ActivityLevel, FormulaBranch } from "@/lib/calc/config";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile, error: profileError }, { data: targets, error: targetError }, { data: weighIns, error: weightError }] = await Promise.all([
    supabase.from("profiles").select("age_years, sex_formula_branch, height_cm, activity_level, preferred_units").maybeSingle(),
    supabase
      .from("calorie_targets")
      .select("source, target_kcal, goal, pace, protein_g, carbs_g, fat_g, fiber_g, created_at")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase.from("body_logs").select("weight_kg").not("weight_kg", "is", null).order("logged_at", { ascending: false }).limit(1),
  ]);

  let body: React.ReactNode;
  if (profileError || targetError || weightError) {
    body = <p className="mt-6 text-sm text-danger">Your profile could not be loaded. Please try again.</p>;
  } else if (!profile) {
    // The profile and its age confirmation are created when the first target is saved.
    body = (
      <p className="mt-6 text-sm text-muted">
        You do not have a saved target yet. <Link className="font-semibold text-ink underline" href="/start">Set up a target</Link>, then save it to your account.
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
    body = <ProfileForm current={current} latestWeightKg={latestWeightKg} profile={saved} />;
  }

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Profile and targets</h1>
      {body}
      <DeleteAccountSection />
    </AuthFrame>
  );
}
