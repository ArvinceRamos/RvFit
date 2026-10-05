import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { AccountDraftSave } from "@/components/account-draft-save";
import { WeighInForm } from "@/components/weigh-in-form";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect("/login");

  const { data: savedTargets } = await supabase
    .from("calorie_targets")
    .select("source, target_kcal, protein_g, carbs_g, fat_g, fiber_g, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  const savedTarget = savedTargets?.[0];
  const hasSavedTarget = Boolean(savedTarget);

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_units")
    .single();
  const preferredUnits = profile?.preferred_units === "imperial" ? "imperial" : "metric";

  const { data: weighIns } = await supabase
    .from("body_logs")
    .select("logged_at, weight_kg")
    .not("weight_kg", "is", null)
    .order("logged_at", { ascending: false })
    .limit(5);

  if (!savedTarget) {
    return <AuthFrame showNav><h1 className="text-3xl font-bold tracking-tight">Account</h1><p className="mt-5 text-zinc-700">Signed in as {user.email}</p><AccountDraftSave hasSavedTarget={false} /></AuthFrame>;
  }

  const weightUnit = preferredUnits === "metric" ? "kg" : "lb";
  const formatWeight = (weightKg: number) => {
    const displayed = preferredUnits === "metric" ? weightKg : weightKg / 0.45359237;
    return `${displayed.toFixed(1)} ${weightUnit}`;
  };

  return <AuthFrame showNav><h1 className="text-3xl font-bold tracking-tight">Account</h1><p className="mt-5 text-zinc-700">Signed in as {user.email}</p><AccountDraftSave hasSavedTarget={hasSavedTarget} /><section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5"><p className="text-sm font-semibold uppercase tracking-wide text-lime-700">Your starting estimate</p><h2 className="mt-2 text-3xl font-bold">{Number(savedTarget.target_kcal).toLocaleString()} kcal</h2><p className="mt-2 text-sm text-zinc-700">Saved as a {savedTarget.source} target. This is a starting estimate, not an exact number.</p><dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4"><div><dt className="text-zinc-600">Protein</dt><dd className="font-bold">{savedTarget.protein_g} g</dd></div><div><dt className="text-zinc-600">Carbohydrates</dt><dd className="font-bold">{savedTarget.carbs_g} g</dd></div><div><dt className="text-zinc-600">Fat</dt><dd className="font-bold">{savedTarget.fat_g} g</dd></div><div><dt className="text-zinc-600">Fiber</dt><dd className="font-bold">{savedTarget.fiber_g} g</dd></div></dl><p className="mt-4 text-sm text-zinc-600">Fiber is included in carbohydrates.</p></section><WeighInForm preferredUnits={preferredUnits} /><section className="mt-8"><h2 className="text-xl font-bold">Recent weigh-ins</h2>{weighIns?.length ? <ol className="mt-4 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">{weighIns.map((weighIn) => <li className="flex items-center justify-between gap-4 px-4 py-3 text-sm" key={weighIn.logged_at}><time dateTime={weighIn.logged_at}>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(weighIn.logged_at))}</time><span className="font-semibold">{formatWeight(Number(weighIn.weight_kg))}</span></li>)}</ol> : <p className="mt-3 text-sm text-zinc-700">No weigh-ins saved yet.</p>}</section></AuthFrame>;
}
