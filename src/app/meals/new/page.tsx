import { AuthFrame } from "@/components/auth-frame";
import { MealBuilder } from "@/components/meal-builder";
import { loadMealContext } from "@/lib/meal-context";
import { requireUser } from "@/lib/supabase/auth";

export default async function NewMealPage() {
  const { supabase } = await requireUser();

  const { foods, suggestionContext } = await loadMealContext(supabase);

  return (
    <AuthFrame showNav>
      <h1 className="text-4xl font-medium tracking-tight">New meal</h1>
      <MealBuilder
        foods={foods}
        suggestionContext={suggestionContext}
        initial={{ mealId: null, date: "", label: "", items: [] }}
      />
    </AuthFrame>
  );
}
