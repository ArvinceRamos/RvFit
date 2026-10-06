import { calculationConfig } from "@/lib/calc/config";
import type { FoodRole } from "@/lib/food-catalog";
import type { MealTotals, NutritionPer100g } from "@/lib/meal";

export const suggestionRoles = ["protein", "carb", "fat"] as const;
export type SuggestionRole = (typeof suggestionRoles)[number];

export type DailyTargets = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type Remaining = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  // null when any food eaten that day has no fiber value, so a false remainder is never shown.
  fiber_g: number | null;
};

export type SuggestableFood = {
  id: string;
  role: FoodRole;
  name: string;
  diet_tags: string[];
  nutrition: NutritionPer100g;
};

export type Exclusions = {
  allergyTags: readonly string[];
  avoidedFoodIds: readonly string[];
};

export type RankedFood<T extends SuggestableFood> = {
  food: T;
  // Grams of the role's macro per kcal of the food. Higher ranks first.
  macro_g_per_kcal: number;
};

// "met" covers a remainder of zero or less. "none_available" means a positive remainder with no eligible food.
export type RoleSuggestions<T extends SuggestableFood> = {
  role: SuggestionRole;
  remaining_g: number;
  status: "suggestions" | "none_available" | "met";
  foods: RankedFood<T>[];
};

// Negative values mean over target. They are kept, not clamped to zero.
export function remainingTargets(targets: DailyTargets, consumed: MealTotals): Remaining {
  return {
    kcal: targets.kcal - consumed.kcal,
    protein_g: targets.protein_g - consumed.protein_g,
    carbs_g: targets.carbs_g - consumed.carbs_g,
    fat_g: targets.fat_g - consumed.fat_g,
    fiber_g: consumed.fiber_incomplete || consumed.fiber_g === null ? null : targets.fiber_g - consumed.fiber_g,
  };
}

const macroPer100g = {
  protein: (nutrition: NutritionPer100g) => nutrition.protein_g_per_100g,
  carb: (nutrition: NutritionPer100g) => nutrition.carbs_g_per_100g,
  fat: (nutrition: NutritionPer100g) => nutrition.fat_g_per_100g,
} as const;

const remainingKey = { protein: "protein_g", carb: "carbs_g", fat: "fat_g" } as const;

// A food is excluded only by its saved diet tags or its own id, never by guessing from its name.
export function isExcluded(food: Pick<SuggestableFood, "id" | "diet_tags">, exclusions: Exclusions): boolean {
  return exclusions.avoidedFoodIds.includes(food.id) || food.diet_tags.some((tag) => exclusions.allergyTags.includes(tag));
}

export function suggestFoodsByRole<T extends SuggestableFood>(
  foods: T[],
  remaining: Remaining,
  exclusions: Exclusions,
  limit: number = calculationConfig.suggestions.foods_per_role,
): RoleSuggestions<T>[] {
  return suggestionRoles.map((role) => {
    const remainingGrams = remaining[remainingKey[role]];
    if (remainingGrams <= 0) return { role, remaining_g: remainingGrams, status: "met", foods: [] };

    const ranked: RankedFood<T>[] = [];
    for (const food of foods) {
      // A food only appears in its own role's list.
      if (food.role !== role || isExcluded(food, exclusions)) continue;
      const macro = macroPer100g[role](food.nutrition);
      // A food with no calories or none of this macro cannot help with this target.
      if (food.nutrition.kcal_per_100g <= 0 || macro <= 0) continue;
      ranked.push({ food, macro_g_per_kcal: macro / food.nutrition.kcal_per_100g });
    }
    ranked.sort((a, b) => b.macro_g_per_kcal - a.macro_g_per_kcal || a.food.name.localeCompare(b.food.name));

    const top = ranked.slice(0, limit);
    return { role, remaining_g: remainingGrams, status: top.length > 0 ? "suggestions" : "none_available", foods: top };
  });
}
