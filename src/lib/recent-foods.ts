// "Recent foods" in the meal builder: distinct foods from the user's latest saved meals, newest first.
// Avoided foods are left out. meals must already be sorted newest first.
export function pickRecentFoodIds(
  meals: readonly { food_ids: readonly string[] }[],
  avoidedFoodIds: readonly string[],
  limit: number,
): string[] {
  const avoided = new Set(avoidedFoodIds);
  const picked: string[] = [];
  for (const meal of meals) {
    for (const id of meal.food_ids) {
      if (picked.length >= limit) return picked;
      if (!avoided.has(id) && !picked.includes(id)) picked.push(id);
    }
  }
  return picked;
}
