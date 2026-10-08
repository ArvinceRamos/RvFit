import type { FoodRole } from "@/lib/food-catalog";

export const mealLabels = ["Meal 1", "Meal 2", "Meal 3", "Meal 4", "Meal 5", "Meal 6"] as const;

export function isMealLabel(value: string): boolean {
  return (mealLabels as readonly string[]).includes(value);
}

export const mealSlots = [
  { key: "protein", label: "Protein", roles: ["protein"] },
  { key: "carb", label: "Carbs", roles: ["carb"] },
  { key: "fat", label: "Fat", roles: ["fat"] },
  { key: "fiber", label: "Fiber (vegetables or fruit)", roles: ["vegetable", "fruit"] },
] as const satisfies readonly { key: string; label: string; roles: readonly FoodRole[] }[];

export type MealSlotKey = (typeof mealSlots)[number]["key"];

// The slot a food role belongs in, or null for roles with no slot (they go in extras).
export function slotForRole(role: FoodRole | null): MealSlotKey | null {
  if (!role) return null;
  return mealSlots.find((slot) => (slot.roles as readonly FoodRole[]).includes(role))?.key ?? null;
}

// Puts a saved meal's items into slots for editing. The first item of each role goes in its slot.
// Later items of the same role, and items with no slot, become extras. Order is kept.
export function mapItemsToSlots<T extends { role: FoodRole | null }>(
  items: readonly T[],
): { slots: Partial<Record<MealSlotKey, T>>; extras: T[] } {
  const slots: Partial<Record<MealSlotKey, T>> = {};
  const extras: T[] = [];
  for (const item of items) {
    const key = slotForRole(item.role);
    if (key && !slots[key]) slots[key] = item;
    else extras.push(item);
  }
  return { slots, extras };
}

// Which labels from Meal 1 to Meal 6 are already used on a date.
export function takenMealLabels(labels: readonly string[]): string[] {
  return mealLabels.filter((label) => labels.includes(label));
}

// The first of Meal 1 to Meal 6 not used on a date, or null when all six are taken.
export function firstFreeMealLabel(usedLabels: readonly string[]): string | null {
  return mealLabels.find((label) => !usedLabels.includes(label)) ?? null;
}
