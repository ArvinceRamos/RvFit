import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { MealBuilder } from "@/components/meal-builder";
import { loadMealContext } from "@/lib/meal-context";
import { createClient } from "@/lib/supabase/server";

export default async function NewMealPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { foods, suggestionContext } = await loadMealContext(supabase);

  return (
    <AuthFrame showNav wide>
      <h1 className="text-3xl font-bold tracking-tight">New meal</h1>
      <MealBuilder
        foods={foods}
        suggestionContext={suggestionContext}
        initial={{ mealId: null, date: "", label: "", items: [] }}
      />
    </AuthFrame>
  );
}
