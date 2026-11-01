import { loadMealContext } from "@/lib/meal-context";
import { ErrorView, LoadingView } from "~/components/screen";
import { MealBuilder } from "~/features/meal-builder";
import { sharedClient } from "~/lib/supabase";
import { useScreenData } from "~/lib/use-screen-data";

async function load() {
  const context = await loadMealContext(sharedClient, { recentFoods: true });
  if (context.foods.length === 0) return { ok: false as const, error: "The food list could not be loaded. Please try again." };
  return { ok: true as const, ...context };
}

// New meal (web: /meals/new).
export default function NewMeal() {
  const screen = useScreenData(["meals", "context"], load);
  if (screen.loading) return <LoadingView label="Loading foods…" />;
  if (!screen.data) return <ErrorView message={screen.error ?? "The food list could not be loaded."} offline={screen.offline} onRetry={screen.retry} />;
  return (
    <MealBuilder
      foods={screen.data.foods}
      initial={{ mealId: null, date: "", label: "", eaten: null, items: [] }}
      recentFoodIds={screen.data.recentFoodIds}
      suggestionContext={screen.data.suggestionContext}
    />
  );
}
