import { useLocalSearchParams } from "expo-router";
import { isUuid } from "@/lib/meal";
import { loadMealContext } from "@/lib/meal-context";
import { ErrorView, LoadingView } from "~/components/screen";
import { MealBuilder } from "~/features/meal-builder";
import { sharedClient, supabase } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";

// Row-level security means only the owner can read a meal, so another user's id finds nothing.
async function load(id: string) {
  if (!isUuid(id)) return { ok: false as const, error: "That meal was not found." };
  const [{ data: meal, error }, context] = await Promise.all([
    supabase.from("meals").select("id, meal_date, label, eaten, meal_items(food_id, grams)").eq("id", id).maybeSingle(),
    loadMealContext(sharedClient, { recentFoods: true }),
  ]);
  if (error || context.foods.length === 0) return { ok: false as const, error: "That meal could not be loaded. Please try again." };
  if (!meal) return { ok: false as const, error: "That meal was not found." };
  return { ok: true as const, meal, ...context };
}

// Edit meal (web: /meals/[id]).
export default function EditMeal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const screen = useScreenData(["meals", "edit", id], () => load(id));
  if (screen.loading) return <LoadingView label="Loading meal…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "That meal could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  const { meal } = screen.data;
  return (
    <MealBuilder
      foods={screen.data.foods}
      initial={{
        mealId: meal.id,
        date: meal.meal_date,
        label: meal.label,
        eaten: meal.eaten,
        items: (meal.meal_items as { food_id: string; grams: number | string }[]).map((item) => ({ foodId: item.food_id, grams: Number(item.grams) })),
      }}
      key={meal.id}
      recentFoodIds={screen.data.recentFoodIds}
      suggestionContext={screen.data.suggestionContext}
    />
  );
}
