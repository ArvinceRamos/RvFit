import Link from "next/link";
import { formatMeasures, stateLabels } from "@/lib/food-catalog";
import { describeNutrition, itemNutrition } from "@/lib/meal";
import type { BuilderFood } from "@/lib/meal-foods";
import { allergenNotice } from "@/lib/preferences";
import { describeRemaining } from "@/lib/remaining-format";
import type { Remaining, RoleSuggestions, SuggestionRole } from "@/lib/suggestions";

export type SuggestionsView =
  | { state: "no-target" }
  | { state: "error" }
  | { state: "no-date" }
  | { state: "loading" }
  | { state: "ready"; remaining: Remaining; suggestions: RoleSuggestions<BuilderFood>[] };

const roleHeadings: Record<SuggestionRole, { title: string; macro: string }> = {
  protein: { title: "Protein foods", macro: "protein" },
  carb: { title: "Carb foods", macro: "carbs" },
  fat: { title: "Fat foods", macro: "fat" },
};

export function SuggestionsPanel({ view, date }: { view: SuggestionsView; date: string }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="text-xl font-bold">Remaining today</h2>
      <p className="mt-1 text-sm text-zinc-600">Based on your saved target, meals saved on {date || "this date"}, and the foods in this meal.</p>

      {view.state === "no-target" && (
        <p className="mt-4 text-sm text-zinc-700">
          Suggestions need a saved calorie target. <Link className="font-semibold underline" href="/start">Set up a target</Link>, then save it to your account.
        </p>
      )}
      {view.state === "no-date" && <p className="mt-4 text-sm text-zinc-700">Choose a date to see what is left for that day.</p>}
      {view.state === "error" && <p className="mt-4 text-sm text-red-800">Suggestions are not available right now. Please try again.</p>}
      {view.state === "loading" && <p className="mt-4 text-sm text-zinc-700">Loading today&apos;s totals…</p>}

      {view.state === "ready" && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-5 lg:grid-cols-3">
            <div><dt className="text-zinc-600">Calories</dt><dd className="font-bold">{describeRemaining(view.remaining.kcal, "kcal")}</dd></div>
            <div><dt className="text-zinc-600">Protein</dt><dd className="font-bold">{describeRemaining(view.remaining.protein_g, "g")}</dd></div>
            <div><dt className="text-zinc-600">Carbs</dt><dd className="font-bold">{describeRemaining(view.remaining.carbs_g, "g")}</dd></div>
            <div><dt className="text-zinc-600">Fat</dt><dd className="font-bold">{describeRemaining(view.remaining.fat_g, "g")}</dd></div>
            <div><dt className="text-zinc-600">Fiber</dt><dd className="font-bold">{view.remaining.fiber_g === null ? "Incomplete" : describeRemaining(view.remaining.fiber_g, "g")}</dd></div>
          </dl>
          {view.remaining.fiber_g === null && <p className="mt-3 text-sm text-zinc-700">Some foods have no fiber listed, so the remaining fiber is not shown.</p>}

          <h2 className="mt-8 text-xl font-bold">Suggested foods</h2>
          <p className="mt-1 text-sm text-zinc-600">These are foods to consider, not amounts. Choose grams or a measure above.</p>
          <div className="mt-4 grid gap-6">
            {view.suggestions.map((group) => (
              <div key={group.role}>
                <h3 className="font-bold">{roleHeadings[group.role].title}</h3>
                {group.status === "met" && (
                  <p className="mt-2 text-sm text-zinc-700">
                    {group.remaining_g === 0 ? `Your ${roleHeadings[group.role].macro} target is reached.` : `You are over your ${roleHeadings[group.role].macro} target, so none are suggested.`}
                  </p>
                )}
                {group.status === "none_available" && <p className="mt-2 text-sm text-zinc-700">No matching suggestion is available.</p>}
                {group.status === "suggestions" && (
                  <ul className="mt-2 grid gap-3">
                    {group.foods.map(({ food, macro_g_per_kcal }) => {
                      const measures = formatMeasures(food.measures);
                      return (
                        <li className="rounded-lg border border-zinc-200 p-3" key={food.id}>
                          <p className="font-semibold">{food.name} <span className="text-sm font-normal text-zinc-600">({stateLabels[food.preparation_state]})</span></p>
                          <p className="mt-1 text-sm text-zinc-700">{(macro_g_per_kcal * 100).toFixed(1)} g {roleHeadings[group.role].macro} per 100 kcal</p>
                          <p className="mt-1 text-sm text-zinc-700">Per 100 g: {describeNutrition(itemNutrition(food.nutrition, 100))}</p>
                          <p className="mt-1 text-sm text-zinc-700">{measures ? `Common measures: ${measures}` : "No common measures listed. Use grams."}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-zinc-700">Suggestions skip foods that match the allergies and avoided foods saved in your <Link className="font-semibold underline" href="/preferences">preferences</Link>. {allergenNotice}</p>
        </>
      )}
    </section>
  );
}
