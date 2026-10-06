import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { MealDaysView } from "@/components/meal-days-view";
import { readMealDayView } from "@/lib/meal-days";
import { createClient } from "@/lib/supabase/server";

export default async function MealsPage({ searchParams }: PageProps<"/meals">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Today, Upcoming, or Past. The tab is in the address so it survives a reload.
  const view = readMealDayView((await searchParams).view);

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
      <MealDaysView target={target} view={view} />
    </AuthFrame>
  );
}
