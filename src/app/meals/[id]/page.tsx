import { notFound } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { MealBuilder } from "@/components/meal-builder";
import { isUuid } from "@/lib/meal";
import { loadMealContext } from "@/lib/meal-context";
import { requireUser } from "@/lib/supabase/auth";

export default async function EditMealPage({ params }: PageProps<"/meals/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  if (!isUuid(id)) notFound();

  // Row-level security means only the owner can read a meal, so another user's id finds nothing.
  const [{ data: meal }, { foods, suggestionContext }] = await Promise.all([
    supabase.from("meals").select("id, meal_date, label, meal_items(food_id, grams)").eq("id", id).maybeSingle(),
    loadMealContext(supabase),
  ]);
  if (!meal) notFound();

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">Edit meal</h1>
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
