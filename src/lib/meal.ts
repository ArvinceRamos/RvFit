import type { Result } from "@/lib/calc/calculate";
import { calculationConfig } from "@/lib/calc/config";
import { formatFiber } from "@/lib/food-catalog";
import { isMealLabel } from "@/lib/meal-slots";

// Placeholder limit pending qualified review. Amounts above it are rejected, never clamped.
export const maxMealItemGrams = calculationConfig.meal_limits.max_item_grams;
export const maxMealLabelLength = 100;

export type NutritionPer100g = {
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g: number | null;
};

export type MealItemNutrition = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number | null;
};

export type MealTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  // null when any item has no fiber value, so a partial total is never shown as a real one.
  fiber_g: number | null;
  fiber_incomplete: boolean;
};

const per100g = 100;

export function itemNutrition(food: NutritionPer100g, grams: number): MealItemNutrition {
  const scale = (value: number) => (value * grams) / per100g;
  return {
    kcal: scale(food.kcal_per_100g),
    protein_g: scale(food.protein_g_per_100g),
    carbs_g: scale(food.carbs_g_per_100g),
    fat_g: scale(food.fat_g_per_100g),
    fiber_g: food.fiber_g_per_100g === null ? null : scale(food.fiber_g_per_100g),
  };
}

// Full precision here. Round only when displaying.
export function mealTotals(items: { food: NutritionPer100g; grams: number }[]): MealTotals {
  const totals: MealTotals = { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, fiber_incomplete: false };
  let fiber = 0;
  for (const { food, grams } of items) {
    const item = itemNutrition(food, grams);
    totals.kcal += item.kcal;
    totals.protein_g += item.protein_g;
    totals.carbs_g += item.carbs_g;
    totals.fat_g += item.fat_g;
    if (item.fiber_g === null) totals.fiber_incomplete = true;
    else fiber += item.fiber_g;
  }
  totals.fiber_g = totals.fiber_incomplete ? null : fiber;
  return totals;
}

// Adds saved totals and draft totals. Fiber stays incomplete if either side is incomplete.
export function addTotals(a: MealTotals, b: MealTotals): MealTotals {
  const fiberIncomplete = a.fiber_incomplete || b.fiber_incomplete;
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fiber_g: fiberIncomplete ? null : (a.fiber_g ?? 0) + (b.fiber_g ?? 0),
    fiber_incomplete: fiberIncomplete,
  };
}

export function describeNutrition(nutrition: MealItemNutrition): string {
  return `${Math.round(nutrition.kcal)} kcal · Protein ${nutrition.protein_g.toFixed(1)} g · Carbs ${nutrition.carbs_g.toFixed(1)} g · Fat ${nutrition.fat_g.toFixed(1)} g · Fiber ${formatFiber(nutrition.fiber_g)}`;
}

// A common measure is only a convenience: it is converted to grams before saving.
export function measureToGrams(measureGrams: number, quantity: number): number {
  return roundGrams(measureGrams * quantity);
}

// The database stores grams with 2 decimal places.
export function roundGrams(grams: number): number {
  return Math.round(grams * 100) / 100;
}

export function validateGrams(grams: number): Result<number> {
  if (!Number.isFinite(grams)) return { ok: false, error: "Enter an amount as a number." };
  const rounded = roundGrams(grams);
  if (rounded <= 0) return { ok: false, error: "The amount must be more than 0 g." };
  if (rounded > maxMealItemGrams) {
    return { ok: false, error: `The amount can be at most ${maxMealItemGrams.toLocaleString("en-US")} g.` };
  }
  return { ok: true, data: rounded };
}

// Reads an amount typed by the user. Returns null when it is blank or not a number.
export function parseAmount(text: string): number | null {
  if (text.trim() === "") return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
}

export type ValidMeal = {
  meal_id: string | null;
  meal_date: string;
  label: string;
  items: { food_id: string; grams: number }[];
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

export function isCalendarDate(value: string): boolean {
  const match = datePattern.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function failure(error: string): Result<never> {
  return { ok: false, error };
}

export function validateMeal(raw: unknown): Result<ValidMeal> {
  if (!raw || typeof raw !== "object") return failure("Meal details are invalid.");
  const input = raw as Record<string, unknown>;

  const mealId = input.mealId ?? null;
  if (mealId !== null && !isUuid(mealId)) return failure("Meal details are invalid.");

  if (typeof input.date !== "string" || !isCalendarDate(input.date)) return failure("Choose a valid date.");

  if (typeof input.label !== "string") return failure("Meal details are invalid.");
  const label = input.label.trim();
  if (label === "") return failure("Choose a meal label.");
  if (label.length > maxMealLabelLength) return failure(`The label can be at most ${maxMealLabelLength} characters.`);
  // New meals use Meal 1 to Meal 6. Editing keeps older free-text labels working.
  if (mealId === null && !isMealLabel(label)) return failure("Choose a meal label from Meal 1 to Meal 6.");

  if (!Array.isArray(input.items)) return failure("Meal details are invalid.");
  if (input.items.length === 0) return failure("Add at least one food.");

  const items: ValidMeal["items"] = [];
  for (const [index, rawItem] of input.items.entries()) {
    const item = rawItem as Record<string, unknown> | null;
    if (!item || typeof item !== "object" || !isUuid(item.foodId) || typeof item.grams !== "number") {
      return failure("Meal details are invalid.");
    }
    const grams = validateGrams(item.grams);
    if (!grams.ok) return failure(`Food ${index + 1}: ${grams.error}`);
    items.push({ food_id: item.foodId, grams: grams.data });
  }

  return { ok: true, data: { meal_id: mealId, meal_date: input.date, label, items } };
}
