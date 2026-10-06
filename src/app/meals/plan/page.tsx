import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { MealPlannerForm } from "@/components/meal-planner-form";
import { loadMealContext } from "@/lib/meal-context";
import { plannerGroups } from "@/lib/meal-planner";
import { isExcluded } from "@/lib/suggestions";
import { createClient } from "@/lib/supabase/server";

export default async function MealPlanPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { foods, suggestionContext: context } = await loadMealContext(supabase);

  let body: React.ReactNode;
  if (context.status === "error") {
    // Without saved allergies and avoided foods, show nothing rather than unfiltered foods.
    body = <p className="mt-6 text-sm text-danger">Your preferences could not be loaded. Please try again.</p>;
  } else if (!context.target) {
    body = (
      <p className="mt-6 text-sm text-muted">
        Meal plans need a saved calorie target. <Link className="font-semibold underline" href="/start">Set up a target</Link>, then save it to your account.
      </p>
    );
  } else {
    const exclusions = { allergyTags: context.allergyTags, avoidedFoodIds: context.avoidedFoodIds };
    // Excluded foods are never offered, so they cannot be picked.
    const plannerFoods = foods.filter(
      (food) => (plannerGroups as readonly string[]).includes(food.role) && !isExcluded(food, exclusions),
    );
    body = <MealPlannerForm exclusions={exclusions} foods={plannerFoods} target={context.target} />;
  }

  return (
    <AuthFrame showNav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Plan meals</h1>
        <Link className="text-sm font-semibold underline" href="/meals">Back to Meals</Link>
      </div>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Pick the foods you have. The plan fits your saved target as closely as these foods allow. It is a starting estimate, not a promise.
      </p>
      {body}
    </AuthFrame>
  );
}
