import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth-frame";
import { FoodSearchInput, type SuggestableFood } from "@/components/food-autocomplete";
import {
  escapeLikePattern,
  foodPageSize,
  foodRoles,
  foodsHref,
  formatFiber,
  formatMeasures,
  preparationStates,
  readFoodFilters,
  roleLabels,
  stateLabels,
} from "@/lib/food-catalog";
import { createClient } from "@/lib/supabase/server";

export default async function FoodsPage({ searchParams }: PageProps<"/foods">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const filters = readFoodFilters(await searchParams);

  let query = supabase
    .from("foods")
    .select(
      "id, name, role, preparation_state, kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g, food_measures(label, grams)",
      { count: "exact" },
    )
    .order("name")
    .range(0, filters.limit - 1);
  if (filters.q) query = query.ilike("name", `%${escapeLikePattern(filters.q)}%`);
  if (filters.role) query = query.eq("role", filters.role);
  if (filters.state) query = query.eq("preparation_state", filters.state);
  const { data: foods, error, count } = await query;
  const total = count ?? foods?.length ?? 0;

  // Names for the search box's type-ahead suggestions.
  const { data: suggestionFoods } = await supabase.from("foods").select("id, name, role, preparation_state").order("name");

  return (
    <AuthFrame showNav>
      <h1 className="text-3xl font-bold tracking-tight">Food library</h1>
      <p className="mt-3 text-sm text-zinc-700">Nutrition values are per 100 g, from USDA FoodData Central.</p>

      <form className="mt-6 grid gap-4 sm:grid-cols-2" method="get">
        <div className="sm:col-span-2">
          <FoodSearchInput foods={(suggestionFoods ?? []) as SuggestableFood[]} initialValue={filters.q} />
        </div>
        <label className="grid gap-1 text-sm font-semibold">
          Role
          <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal" defaultValue={filters.role ?? ""} name="role">
            <option value="">All roles</option>
            {foodRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Raw or cooked
          <select className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base font-normal" defaultValue={filters.state ?? ""} name="state">
            <option value="">All</option>
            {preparationStates.map((state) => <option key={state} value={state}>{stateLabels[state]}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-4 sm:col-span-2">
          <button className="rounded-lg bg-lime-400 px-4 py-3 font-bold" type="submit">Search</button>
          <Link className="text-sm font-semibold underline" href="/foods">Clear</Link>
        </div>
      </form>

      {error ? (
        <p className="mt-8 text-sm text-red-800">The food library could not be loaded. Please try again.</p>
      ) : foods.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-700">No foods match your search.</p>
      ) : (
        <>
          <p aria-live="polite" className="mt-8 text-sm text-zinc-700">Showing {foods.length} of {total} {total === 1 ? "food" : "foods"}</p>
          <ul className="mt-3 grid gap-3">
            {foods.map((food) => {
              const measures = formatMeasures(food.food_measures.map((measure) => ({ label: measure.label, grams: Number(measure.grams) })));
              return (
                <li className="rounded-xl border border-zinc-200 bg-white p-4" key={food.id}>
                  <h2 className="font-bold">{food.name}</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {roleLabels[food.role as keyof typeof roleLabels]} · {stateLabels[food.preparation_state as keyof typeof stateLabels]}
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-3 text-sm sm:grid-cols-5">
                    <div><dt className="text-zinc-600">Calories</dt><dd className="font-bold">{Math.round(Number(food.kcal_per_100g))} kcal</dd></div>
                    <div><dt className="text-zinc-600">Protein</dt><dd className="font-bold">{Number(food.protein_g_per_100g).toFixed(1)} g</dd></div>
                    <div><dt className="text-zinc-600">Carbs</dt><dd className="font-bold">{Number(food.carbs_g_per_100g).toFixed(1)} g</dd></div>
                    <div><dt className="text-zinc-600">Fat</dt><dd className="font-bold">{Number(food.fat_g_per_100g).toFixed(1)} g</dd></div>
                    <div><dt className="text-zinc-600">Fiber</dt><dd className="font-bold">{formatFiber(food.fiber_g_per_100g === null ? null : Number(food.fiber_g_per_100g))}</dd></div>
                  </dl>
                  <p className="mt-3 text-sm text-zinc-700">
                    {measures ? `Common measures: ${measures}` : "No common measures listed. Use grams."}
                  </p>
                </li>
              );
            })}
          </ul>
          {total > foods.length && (
            <Link className="mt-4 inline-block rounded-lg border border-zinc-300 bg-white px-4 py-3 font-semibold hover:bg-zinc-100" href={foodsHref(filters, filters.limit + foodPageSize)}>
              Show more
            </Link>
          )}
        </>
      )}
    </AuthFrame>
  );
}
