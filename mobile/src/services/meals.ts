import { calculationConfig } from "@/lib/calc/config";
import { addTotals, isCalendarDate, isUuid, mealTotals, validateMeal, type MealTotals } from "@/lib/meal";
import { loadDayTotals, type DayTotalsResult } from "@/lib/meal-days-data";
import { checkPlanFoods, findLabelClash, labelClashMessage, validateMealPlan, type PlanFood } from "@/lib/meal-plan-save";
import type { LoggedDay } from "@/lib/meal-planner";
import { copyDayLabels, firstFreeMealLabel, mealsToCopy } from "@/lib/meal-slots";
import { loadMeals } from "@/lib/overview-data";
import { addDays } from "@/lib/week";
import { logError } from "@/lib/log";
import { sharedClient, supabase } from "~/lib/supabase";
import { currentUserId, type ActionResult } from "./session";

// Mobile versions of src/app/meals/actions.ts. Same checks, same database functions, same messages.

// warning: the meal saved but the "eaten" tick failed (web: saveMealAction).
export type SaveMealResult = { ok: true; mealId: string; warning?: string } | { ok: false; error: string };

export async function saveMeal(rawMeal: unknown): Promise<SaveMealResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to save a meal." };
  const validated = validateMeal(rawMeal);
  if (!validated.ok) return validated;
  const meal = validated.data;

  const { data: mealId, error } = await supabase.rpc("save_meal", { p_meal_id: meal.meal_id, p_meal_date: meal.meal_date, p_label: meal.label, p_items: meal.items });
  if (error?.code === "23505") return { ok: false, error: `${meal.label} is already used on that date. Choose another label.` };
  if (error || typeof mealId !== "string") {
    if (error) logError("meals.save", error);
    return { ok: false, error: "Your meal could not be saved. Please try again." };
  }
  // save_meal does not take the tick, so it is set straight after. If that fails, the meal is still saved.
  if (meal.eaten !== null) {
    const { error: eatenError } = await supabase.from("meals").update({ eaten: meal.eaten }).eq("id", mealId);
    if (eatenError) {
      logError("meals.saveEaten", eatenError);
      // The meal is saved, so report success; a retry would only hit "label already used".
      return { ok: true, mealId, warning: "Meal saved, but it could not be ticked as eaten. Tick it on the Food page." };
    }
  }
  return { ok: true, mealId };
}

export type CopyMealResult = { ok: true; label: string } | { ok: false; error: string };

// "Log again": copies a saved meal's foods and grams to a date under the first free label.
export async function copyMealToDate(mealId: unknown, date: unknown): Promise<CopyMealResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to log a meal." };
  if (!isUuid(mealId) || typeof date !== "string" || !isCalendarDate(date)) return { ok: false, error: "Meal details are invalid." };

  const [{ data: meal, error: mealError }, { data: sameDay, error: dayError }] = await Promise.all([
    supabase.from("meals").select("meal_items(food_id, grams)").eq("id", mealId).maybeSingle(),
    supabase.from("meals").select("label").eq("meal_date", date),
  ]);
  if (mealError || dayError) {
    logError("meals.copy", mealError, dayError);
    return { ok: false, error: "That meal could not be copied. Please try again." };
  }
  if (!meal) return { ok: false, error: "That meal was not found." };
  const label = firstFreeMealLabel((sameDay ?? []).map((row) => row.label as string));
  if (!label) return { ok: false, error: "All six meal labels are used on that day." };
  const items = (meal.meal_items as { food_id: string; grams: number | string }[]).map((item) => ({ foodId: item.food_id, grams: Number(item.grams) }));
  const saved = await saveMeal({ mealId: null, date, label, items });
  if (!saved.ok) return { ok: false, error: saved.error };
  return { ok: true, label };
}

export type CopyMealDayResult = { ok: true; count: number } | { ok: false; error: string };

// "Copy yesterday": all or nothing, skipping meals already on the day with the same foods and grams.
export async function copyMealDay(fromDate: unknown, toDate: unknown): Promise<CopyMealDayResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to copy meals." };
  if (typeof fromDate !== "string" || !isCalendarDate(fromDate) || typeof toDate !== "string" || !isCalendarDate(toDate) || fromDate === toDate) {
    return { ok: false, error: "Meal details are invalid." };
  }
  const [{ data: fromMeals, error: fromError }, { data: toMeals, error: toError }] = await Promise.all([
    supabase.from("meals").select("label, meal_items(food_id, grams)").eq("meal_date", fromDate).order("label").order("created_at"),
    supabase.from("meals").select("label, meal_items(food_id, grams)").eq("meal_date", toDate),
  ]);
  if (fromError || toError || !fromMeals || !toMeals) {
    logError("meals.copyDay", fromError, toError);
    return { ok: false, error: "Those meals could not be copied. Please try again." };
  }
  type CopyMeal = { label: string; meal_items: { food_id: string; grams: number | string }[] };
  const fromWithFoods = (fromMeals as CopyMeal[]).filter((meal) => meal.meal_items.length > 0);
  if (fromWithFoods.length === 0) return { ok: false, error: "There are no meals to copy." };
  const meals = mealsToCopy(fromWithFoods, toMeals as CopyMeal[]);
  if (meals.length === 0) return { ok: false, error: "Those meals are already on that day, so nothing was copied." };
  const labels = copyDayLabels(meals.map((meal) => meal.label), (toMeals as CopyMeal[]).map((row) => row.label));
  if (!labels) return { ok: false, error: "There are not enough free meal labels to copy every meal. Nothing was copied." };

  const { data: mealIds, error } = await supabase.rpc("save_meal_plan", {
    p_meals: meals.map((meal, index) => ({ meal_date: toDate, label: labels[index], items: meal.meal_items.map((item) => ({ food_id: item.food_id, grams: Number(item.grams) })) })),
  });
  if (error?.code === "23505") return { ok: false, error: "A meal was saved on that day at the same time. Nothing was copied. Please try again." };
  if (error || !Array.isArray(mealIds) || mealIds.length !== meals.length) {
    logError("meals.copyDay", error);
    return { ok: false, error: "Those meals could not be copied. Please try again." };
  }
  const { error: fromPlanError } = await supabase.from("meals").update({ from_plan: false }).in("id", mealIds as string[]);
  if (fromPlanError) logError("meals.copyDayFromPlan", fromPlanError);
  return { ok: true, count: meals.length };
}

export type SaveMealPlanResult = { ok: true; mealIds: string[] } | { ok: false; error: string };

// Saves a previewed plan as normal meals. Allergies and avoided foods are checked again first.
export async function saveMealPlan(rawPlan: unknown): Promise<SaveMealPlanResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to save a meal plan." };
  const validated = validateMealPlan(rawPlan);
  if (!validated.ok) return validated;
  const meals = validated.data;

  const foodIds = [...new Set(meals.flatMap((meal) => meal.items.map((item) => item.food_id)))];
  const dates = [...new Set(meals.map((meal) => meal.meal_date))];
  const [foods, preferences, avoided, saved] = await Promise.all([
    supabase.from("foods").select("id, name, role, diet_tags, portion_class").in("id", foodIds),
    supabase.from("user_preferences").select("allergy_tags").maybeSingle(),
    supabase.from("user_avoided_foods").select("food_id"),
    supabase.from("meals").select("meal_date, label").in("meal_date", dates),
  ]);
  // If saved allergies or avoided foods cannot be read, save nothing rather than skip the check.
  if (foods.error || preferences.error || avoided.error || saved.error || !foods.data || !avoided.data || !saved.data) {
    logError("meals.savePlan", foods.error, preferences.error, avoided.error, saved.error);
    return { ok: false, error: "Your plan could not be saved. Please try again." };
  }
  const foodError = checkPlanFoods(meals, foods.data as PlanFood[], {
    allergyTags: preferences.data?.allergy_tags ?? [],
    avoidedFoodIds: avoided.data.map((row) => row.food_id),
  });
  if (foodError) return { ok: false, error: foodError };
  const clash = findLabelClash(meals, saved.data as { meal_date: string; label: string }[]);
  if (clash) return { ok: false, error: clash };

  const { data: mealIds, error } = await supabase.rpc("save_meal_plan", { p_meals: meals.map(({ meal_date, label, items }) => ({ meal_date, label, items })) });
  if (error?.code === "23505") return { ok: false, error: labelClashMessage };
  if (error || !Array.isArray(mealIds) || mealIds.length !== meals.length) {
    if (error) logError("meals.savePlan", error);
    return { ok: false, error: "Your plan could not be saved. Please try again." };
  }
  return { ok: true, mealIds: mealIds as string[] };
}

export async function setMealEaten(mealId: unknown, eaten: unknown): Promise<ActionResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to update a meal." };
  if (!isUuid(mealId) || typeof eaten !== "boolean") return { ok: false, error: "Meal details are invalid." };
  const { data, error } = await supabase.from("meals").update({ eaten }).eq("id", mealId).select("id");
  if (error) {
    logError("meals.update", error);
    return { ok: false, error: "The meal could not be updated. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Meal not found." };
  return { ok: true };
}

export async function deleteMeal(mealId: unknown): Promise<ActionResult> {
  if (!(await currentUserId())) return { ok: false, error: "You must be signed in to delete a meal." };
  if (!isUuid(mealId)) return { ok: false, error: "Meal details are invalid." };
  const { data, error } = await supabase.from("meals").delete().eq("id", mealId).select("id");
  if (error) {
    logError("meals.delete", error);
    return { ok: false, error: "The meal could not be deleted. Please try again." };
  }
  if (!data || data.length === 0) return { ok: false, error: "Meal not found." };
  return { ok: true };
}

// For the meal builder, whose date can change on the screen.
export async function fetchDayTotals(date: string, excludeMealId: string | null): Promise<DayTotalsResult> {
  if (!(await currentUserId())) return { ok: false };
  if (!isCalendarDate(date)) return { ok: false };
  if (excludeMealId !== null && !isUuid(excludeMealId)) return { ok: false };
  return loadDayTotals(sharedClient, date, excludeMealId);
}

export type PlanDaysResult = { ok: true; logged: Record<string, LoggedDay> } | { ok: false };

// Labels and totals of meals already saved on each date of a plan, for the meal planner.
export async function fetchPlanDays(startDate: string, days: number): Promise<PlanDaysResult> {
  if (!(await currentUserId())) return { ok: false };
  if (!isCalendarDate(startDate)) return { ok: false };
  if (!Number.isInteger(days) || days < 1 || days > calculationConfig.meal_planner.max_days) return { ok: false };
  const meals = await loadMeals(sharedClient, startDate, addDays(startDate, days - 1));
  if (!meals) return { ok: false };
  const logged: Record<string, { labels: string[]; totals: MealTotals }> = {};
  for (const meal of meals) {
    const day = (logged[meal.meal_date] ??= { labels: [], totals: mealTotals([]) });
    day.labels.push(meal.label);
    day.totals = addTotals(day.totals, meal.totals);
  }
  return { ok: true, logged };
}
