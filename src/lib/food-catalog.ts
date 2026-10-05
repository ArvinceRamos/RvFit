export const foodRoles = ["protein", "carb", "fat", "vegetable", "fruit", "other"] as const;
export const preparationStates = ["raw", "cooked", "other"] as const;

export type FoodRole = (typeof foodRoles)[number];
export type PreparationState = (typeof preparationStates)[number];

export const roleLabels: Record<FoodRole, string> = {
  protein: "Protein",
  carb: "Carb",
  fat: "Fat",
  vegetable: "Vegetable",
  fruit: "Fruit",
  other: "Other",
};

export const stateLabels: Record<PreparationState, string> = {
  raw: "Raw",
  cooked: "Cooked",
  other: "Other",
};

export type FoodFilters = {
  q: string;
  role: FoodRole | null;
  state: PreparationState | null;
  limit: number;
};

export const foodPageSize = 20;
const maxFoodLimit = 500;

const maxSearchLength = 60;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function readFoodFilters(params: Record<string, string | string[] | undefined>): FoodFilters {
  const role = firstValue(params.role);
  const state = firstValue(params.state);
  return {
    q: firstValue(params.q).trim().slice(0, maxSearchLength),
    role: (foodRoles as readonly string[]).includes(role) ? (role as FoodRole) : null,
    state: (preparationStates as readonly string[]).includes(state) ? (state as PreparationState) : null,
    limit: readLimit(firstValue(params.limit)),
  };
}

function readLimit(value: string): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < foodPageSize) return foodPageSize;
  return Math.min(limit, maxFoodLimit);
}

export function foodsHref(filters: FoodFilters, limit: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role) params.set("role", filters.role);
  if (filters.state) params.set("state", filters.state);
  params.set("limit", String(limit));
  return `/foods?${params.toString()}`;
}

// Type-ahead matches: names starting with the text first, then words starting with it, then any match.
export function suggestFoods<T extends { name: string }>(foods: T[], query: string, limit = 8): T[] {
  const text = query.trim().toLowerCase();
  if (!text) return [];
  const ranked: { food: T; rank: number }[] = [];
  for (const food of foods) {
    const name = food.name.toLowerCase();
    const index = name.indexOf(text);
    if (index === -1) continue;
    const rank = index === 0 ? 0 : /[^a-z0-9]/.test(name[index - 1]) ? 1 : 2;
    ranked.push({ food, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.food.name.localeCompare(b.food.name));
  return ranked.slice(0, limit).map((entry) => entry.food);
}

// Escapes the characters that act as wildcards in a Postgres LIKE pattern.
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

// Missing fiber is shown as "Not listed", never as 0 g.
export function formatFiber(value: number | null): string {
  return value === null ? "Not listed" : `${value.toFixed(1)} g`;
}

export function formatMeasures(measures: { label: string; grams: number }[]): string {
  return measures.map((measure) => `${measure.label} (${measure.grams} g)`).join("; ");
}
