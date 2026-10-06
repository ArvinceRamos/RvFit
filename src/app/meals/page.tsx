import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { DeleteMealButton } from "@/components/delete-meal-button";
import { TodaySummary } from "@/components/today-summary";
import { formatFiber } from "@/lib/food-catalog";
import { mealTotals } from "@/lib/meal";
import { nutritionColumns, nutritionFromRow } from "@/lib/meal-foods";
import { createClient } from "@/lib/supabase/server";

const recentMealLimit = 50;

// Meal dates are plain calendar dates, so format the parts directly to avoid time zone shifts.
function formatMealDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: meals, error } = await supabase
    .from("meals")
    .select(`id, meal_date, label, meal_items(grams, foods(${nutritionColumns}))`)
    .order("meal_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(recentMealLimit);

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
      <h1 className="text-3xl font-bold tracking-tight">Meals</h1>
      <TodaySummary refreshKey={(meals ?? []).map((meal) => meal.id).join(",")} target={target} />
      <Link className="mt-6 inline-block rounded-lg bg-lime-400 px-4 py-3 font-bold" href="/meals/new">New meal</Link>

      {error ? (
        <p className="mt-8 text-sm text-red-800">Your meals could not be loaded. Please try again.</p>
      ) : !meals || meals.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-700">No meals saved yet.</p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {meals.map((meal) => {
            // Each item belongs to one food, so PostgREST returns a single object here.
            const items = meal.meal_items as unknown as { grams: number | string; foods: Parameters<typeof nutritionFromRow>[0] }[];
            const totals = mealTotals(items.map((item) => ({ food: nutritionFromRow(item.foods), grams: Number(item.grams) })));
            return (
              <li className="rounded-xl border border-zinc-200 bg-white p-4" key={meal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold">{meal.label}</h2>
                    <p className="text-sm text-zinc-600">{formatMealDate(meal.meal_date)} · {items.length} {items.length === 1 ? "food" : "foods"}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <Link className="text-sm font-semibold underline" href={`/meals/${meal.id}`}>Edit</Link>
                    <DeleteMealButton mealId={meal.id} />
                  </div>
                </div>
                <p className="mt-3 text-sm text-zinc-700">
                  {Math.round(totals.kcal)} kcal · Protein {totals.protein_g.toFixed(1)} g · Carbs {totals.carbs_g.toFixed(1)} g · Fat {totals.fat_g.toFixed(1)} g · Fiber {totals.fiber_incomplete ? "Incomplete" : formatFiber(totals.fiber_g)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </AuthFrame>
  );
}
