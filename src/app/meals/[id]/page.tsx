import { notFound, redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { MealBuilder } from "@/components/meal-builder";
import { isUuid } from "@/lib/meal";
import { loadMealContext } from "@/lib/meal-context";
import { createClient } from "@/lib/supabase/server";

export default async function EditMealPage({ params }: PageProps<"/meals/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isUuid(id)) notFound();

  // Row-level security means only the owner can read a meal, so another user's id finds nothing.
  const { data: meal } = await supabase
    .from("meals")
    .select("id, meal_date, label, meal_items(food_id, grams)")
    .eq("id", id)
    .maybeSingle();
  if (!meal) notFound();

  const { foods, suggestionContext } = await loadMealContext(supabase);

  return (
    <AuthFrame showNav wide>
      <h1 className="text-3xl font-bold tracking-tight">Edit meal</h1>
      <MealBuilder
        foods={foods}
        suggestionContext={suggestionContext}
        initial={{
          mealId: meal.id,
          date: meal.meal_date,
          label: meal.label,
          items: meal.meal_items.map((item: { food_id: string; grams: number | string }) => ({
            foodId: item.food_id,
            grams: Number(item.grams),
          })),
        }}
      />
    </AuthFrame>
  );
}
