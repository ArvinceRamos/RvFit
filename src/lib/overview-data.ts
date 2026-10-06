import { addTotals, mealTotals, type MealTotals } from "@/lib/meal";
import { nutritionColumns, nutritionFromRow, type NutritionRow } from "@/lib/meal-foods";
import type { DailyTargets } from "@/lib/suggestions";
import type { createClient } from "@/lib/supabase/server";
import type { PreferredUnits } from "@/lib/weigh-in";
import { resolveTemplate, resolveTemplateByKey } from "@/lib/workouts/templates";

// Loaders for the Dashboard, Weekly plan, and Progress. They read as the signed-in user,
// so row-level security limits every query to that user's rows.
type Client = Awaited<ReturnType<typeof createClient>>;

type ItemRow = { grams: number | string; foods: NutritionRow };

// Each item belongs to one food, so PostgREST returns a single object here.
export function itemRowsTotals(items: readonly ItemRow[]): MealTotals {
  return mealTotals(items.map((item) => ({ food: nutritionFromRow(item.foods), grams: Number(item.grams) })));
}

// Day totals from several meals. Fiber stays incomplete if any meal is incomplete.
export function sumMealTotals(totals: readonly MealTotals[]): MealTotals {
  return totals.reduce(addTotals, mealTotals([]));
}

export type DayMeal ={ id: string; label: string; meal_date: string; totals: MealTotals };

export async function loadMeals(supabase: Client, from: string, to: string): Promise<DayMeal[] | null> {
  const { data, error } = await supabase
    .from("meals")
    .select(`id, label, meal_date, created_at, meal_items(grams, foods(${nutritionColumns}))`)
    .gte("meal_date", from)
    .lte("meal_date", to)
    .order("meal_date")
    .order("created_at");
  if (error || !data) return null;
  return data.map((meal) => ({
    id: meal.id as string,
    label: meal.label as string,
    meal_date: meal.meal_date as string,
    totals: itemRowsTotals(meal.meal_items as unknown as ItemRow[]),
  }));
}

export type LoggedWorkout = {
  id: string;
  template_key: string;
  day_key: string;
  day_name: string;
  performed_on: string;
  set_count: number;
};

// A saved key that no longer matches any template shows its raw day key instead of failing.
export async function loadWorkouts(supabase: Client, from: string, to: string): Promise<LoggedWorkout[] | null> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select("id, template_key, day_key, performed_on, created_at, workout_log_sets(count)")
    .gte("performed_on", from)
    .lte("performed_on", to)
    .order("performed_on")
    .order("created_at");
  if (error || !data) return null;
  return data.map((log) => ({
    id: log.id as string,
    template_key: log.template_key as string,
    day_key: log.day_key as string,
    day_name: resolveTemplateByKey(log.template_key)?.days.find((day) => day.key === log.day_key)?.name ?? (log.day_key as string),
    performed_on: log.performed_on as string,
    // PostgREST returns the set count as a one-item list.
    set_count: (log.workout_log_sets as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export type SavedTarget = DailyTargets & { source: "calculated" | "manual"; created_at: string };

// The newest target row by created_at. Null when there is none. "error" when it could not be read.
export async function loadSavedTarget(supabase: Client): Promise<SavedTarget | null | "error"> {
  const { data, error } = await supabase
    .from("calorie_targets")
    .select("target_kcal, protein_g, carbs_g, fat_g, fiber_g, source, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return "error";
  const row = data?.[0];
  if (!row) return null;
  return {
    kcal: Number(row.target_kcal),
    protein_g: Number(row.protein_g),
    carbs_g: Number(row.carbs_g),
    fat_g: Number(row.fat_g),
    fiber_g: Number(row.fiber_g),
    source: row.source as "calculated" | "manual",
    created_at: row.created_at as string,
  };
}

export async function loadUnits(supabase: Client): Promise<PreferredUnits | null> {
  const { data, error } = await supabase.from("profiles").select("preferred_units").maybeSingle();
  if (error) return null;
  return data?.preferred_units === "imperial" ? "imperial" : "metric";
}

export type WeighInRow = {
  id: string;
  logged_at: string;
  weight_kg: number | null;
  waist_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
};

const bodyColumns = "id, logged_at, weight_kg, waist_cm, chest_cm, hips_cm";

function toNumber(value: number | string | null): number | null {
  return value === null ? null : Number(value);
}

function toWeighIn(row: Record<string, unknown>): WeighInRow {
  return {
    id: row.id as string,
    logged_at: row.logged_at as string,
    weight_kg: toNumber(row.weight_kg as number | string | null),
    waist_cm: toNumber(row.waist_cm as number | string | null),
    chest_cm: toNumber(row.chest_cm as number | string | null),
    hips_cm: toNumber(row.hips_cm as number | string | null),
  };
}

// Weigh-ins that have a weight since a moment. The caller applies the trend rule.
export async function loadWeighInsSince(supabase: Client, since: Date): Promise<WeighInRow[] | null> {
  const { data, error } = await supabase
    .from("body_logs")
    .select(bodyColumns)
    .not("weight_kg", "is", null)
    .gte("logged_at", since.toISOString())
    .order("logged_at", { ascending: false });
  return error || !data ? null : data.map(toWeighIn);
}

export async function loadLatestWeighIns(supabase: Client, limit: number): Promise<WeighInRow[] | null> {
  const { data, error } = await supabase.from("body_logs").select(bodyColumns).order("logged_at", { ascending: false }).limit(limit);
  return error || !data ? null : data.map(toWeighIn);
}

export type PlanDay = { key: string; name: string };

// The user's workout days from saved Preferences. Never guessed: null when preferences are not set.
export async function loadPlanDays(supabase: Client): Promise<{ template_key: string; days: PlanDay[] } | null | "error"> {
  const { data, error } = await supabase.from("user_preferences").select("experience, equipment, training_days").maybeSingle();
  if (error) return "error";
  const template = data ? resolveTemplate(data.experience, data.training_days, data.equipment) : null;
  return template ? { template_key: template.key, days: template.days.map((day) => ({ key: day.key, name: day.name })) } : null;
}
