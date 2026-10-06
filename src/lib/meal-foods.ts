import type { PortionClass } from "@/lib/calc/config";
import type { FoodRole, PreparationState } from "@/lib/food-catalog";
import type { NutritionPer100g } from "@/lib/meal";

export type BuilderFood = {
  id: string;
  name: string;
  role: FoodRole;
  preparation_state: PreparationState;
  diet_tags: string[];
  nutrition: NutritionPer100g;
  measures: { label: string; grams: number }[];
  // Meal planner portion class and unit size. Null for foods the planner does not use.
  portion_class: PortionClass | null;
  portion_unit_g: number | null;
};

export const nutritionColumns =
  "kcal_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, fiber_g_per_100g";
export const builderFoodColumns = `id, name, role, preparation_state, diet_tags, ${nutritionColumns}, portion_class, portion_unit_g, food_measures(label, grams)`;

export type NutritionRow = {
  kcal_per_100g: number | string;
  protein_g_per_100g: number | string;
  carbs_g_per_100g: number | string;
  fat_g_per_100g: number | string;
  fiber_g_per_100g: number | string | null;
};

export type BuilderFoodRow = NutritionRow & {
  id: string;
  name: string;
  role: string;
  preparation_state: string;
  diet_tags: string[];
  food_measures: { label: string; grams: number | string }[];
  portion_class: string | null;
  portion_unit_g: number | string | null;
};

// Missing fiber stays null here. It must never become 0.
export function nutritionFromRow(row: NutritionRow): NutritionPer100g {
  return {
    kcal_per_100g: Number(row.kcal_per_100g),
    protein_g_per_100g: Number(row.protein_g_per_100g),
    carbs_g_per_100g: Number(row.carbs_g_per_100g),
    fat_g_per_100g: Number(row.fat_g_per_100g),
    fiber_g_per_100g: row.fiber_g_per_100g === null ? null : Number(row.fiber_g_per_100g),
  };
}

export function toBuilderFood(row: BuilderFoodRow): BuilderFood {
  return {
    id: row.id,
    name: row.name,
    role: row.role as FoodRole,
    preparation_state: row.preparation_state as PreparationState,
    diet_tags: row.diet_tags,
    nutrition: nutritionFromRow(row),
    measures: row.food_measures.map((measure) => ({ label: measure.label, grams: Number(measure.grams) })),
    portion_class: row.portion_class as PortionClass | null,
    portion_unit_g: row.portion_unit_g === null ? null : Number(row.portion_unit_g),
  };
}
