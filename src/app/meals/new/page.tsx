import { AuthFrame } from "@/components/auth-frame";
import { MealBuilder } from "@/components/meal-builder";
import { loadMealContext } from "@/lib/meal-context";
import { requireUser } from "@/lib/supabase/auth";

export default async function NewMealPage() {
  const { supabase } = await requireUser();

  const { foods, suggestionContext, recentFoodIds } = await loadMealContext(supabase, { recentFoods: true });

  return (
    <AuthFrame showNav>
      <h1 className="page-title">New meal</h1>
      <MealBuilder
        foods={foods}
        recentFoodIds={recentFoodIds}
        suggestionContext={suggestionContext}
        initial={{ mealId: null, date: "", label: "", eaten: null, items: [] }}
      />
    </AuthFrame>
  );
}
