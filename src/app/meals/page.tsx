import { AuthFrame } from "@/components/auth-frame";
import { MealDaysView } from "@/components/meal-days-view";
import { targetForDate } from "@/lib/calc/day-targets";
import { readMealDayView } from "@/lib/meal-days";
import { loadDayTotals, loadMealDays } from "@/lib/meal-days-data";
import { requestClock } from "@/lib/request-clock";
import { requireUser } from "@/lib/supabase/auth";

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const [{ supabase }, { today }, params] = await Promise.all([requireUser(), requestClock(), searchParams]);

  // Today, Upcoming, or Past. The tab is in the address so it survives a reload.
  const view = readMealDayView(params.view);
  // Set by the meal planner after it saves.
  const planSaved = params.saved === "plan";

  const [{ data: targetRows }, result, todayTotals, { data: preferences }] = await Promise.all([
    supabase
      .from("calorie_targets")
      .select("target_kcal, protein_g, carbs_g, fat_g, fiber_g")
      .order("created_at", { ascending: false })
      .limit(1),
    loadMealDays(supabase, view, today),
    loadDayTotals(supabase, today, null),
    // Training days decide today's rest-day or training-day target. Without them, today uses the saved target.
    supabase.from("user_preferences").select("training_days").maybeSingle(),
  ]);
  const row = targetRows?.[0];
  const target = row
    ? targetForDate(
        { kcal: Number(row.target_kcal), protein_g: Number(row.protein_g), carbs_g: Number(row.carbs_g), fat_g: Number(row.fat_g), fiber_g: Number(row.fiber_g) },
        today,
        preferences?.training_days ?? null,
      )
    : null;

  return (
    <AuthFrame showNav>
      <h1 className="page-title">Food</h1>
      {planSaved && (
        <p className="alert-success mt-4" role="status">
          Your plan is saved. Tick each planned meal when you eat it; only ticked meals count toward the day&apos;s totals.
        </p>
      )}
      <MealDaysView result={result} target={target} today={today} todayTotals={todayTotals} view={view} />
    </AuthFrame>
  );
}
