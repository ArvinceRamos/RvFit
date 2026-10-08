import { AuthFrame } from "@/components/auth-frame";
import { MealDaysView } from "@/components/meal-days-view";
import { readMealDayView } from "@/lib/meal-days";
import { requireUser } from "@/lib/supabase/auth";

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const { supabase } = await requireUser();

  // Today, Upcoming, or Past. The tab is in the address so it survives a reload.
  const params = await searchParams;
  const view = readMealDayView(params.view);
  // Set by the meal planner after it saves.
  const planSaved = params.saved === "plan";

  const { data: targetRows } = await supabase
    .from("calorie_targets")
    .select("target_kcal, protein_g, carbs_g, fat_g, fiber_g")
    .order("created_at", { ascending: false })
    .limit(1);
  const row = targetRows?.[0];
  const target = row
    ? { kcal: Number(row.target_kcal), protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) }
    : null;

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Meals</h1>
      {planSaved && (
        <p className="alert-success mt-4" role="status">
          Your plan is saved. Tick each planned meal when you eat it; only ticked meals count toward the day&apos;s totals.
        </p>
      )}
      <MealDaysView target={target} view={view} />
    </AuthFrame>
  );
}
