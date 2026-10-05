import type { Result } from "@/lib/calc/calculate";

export const dietTags = [
  "meat",
  "fish",
  "shellfish",
  "dairy",
  "egg",
  "gluten",
  "peanuts",
  "tree_nuts",
  "soy",
  "sesame",
] as const;
export const experiences = ["beginner", "intermediate"] as const;
export const equipmentOptions = ["bodyweight", "dumbbell_only", "gym"] as const;

export type DietTag = (typeof dietTags)[number];
export type Experience = (typeof experiences)[number];
export type Equipment = (typeof equipmentOptions)[number];

export const allergenNotice =
  "Only these allergens are filtered. Other allergens are not filtered, so always check food labels.";

export const dietTagLabels: Record<DietTag, string> = {
  meat: "Meat",
  fish: "Fish",
  shellfish: "Shellfish",
  dairy: "Dairy",
  egg: "Egg",
  gluten: "Gluten",
  peanuts: "Peanuts",
  tree_nuts: "Tree nuts",
  soy: "Soy",
  sesame: "Sesame",
};

export const experienceLabels: Record<Experience, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
};

export const equipmentLabels: Record<Equipment, string> = {
  bodyweight: "Bodyweight only",
  dumbbell_only: "Dumbbells only",
  gym: "Gym",
};

const trainingDayRanges: Record<Experience, { min: number; max: number }> = {
  beginner: { min: 2, max: 4 },
  intermediate: { min: 2, max: 6 },
};

export function trainingDayOptions(experience: Experience): number[] {
  const { min, max } = trainingDayRanges[experience];
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

export type PreferencesInput = {
  allergyTags: string[];
  avoidedFoodIds: string[];
  experience: string;
  equipment: string;
  trainingDays: number;
};

export type ValidPreferences = {
  allergy_tags: DietTag[];
  avoided_food_ids: string[];
  experience: Experience;
  equipment: Equipment;
  training_days: number;
};

// Only offer allergy options that appear on at least one catalog food, in a fixed order.
export function availableAllergyTags(catalogTagLists: (string[] | null)[]): DietTag[] {
  const present = new Set(catalogTagLists.flatMap((tags) => tags ?? []));
  return dietTags.filter((tag) => present.has(tag));
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function failure(error: string): Result<never> {
  return { ok: false, error };
}

export function validatePreferences(raw: unknown, offeredTags: readonly string[]): Result<ValidPreferences> {
  if (!raw || typeof raw !== "object") return failure("Preference details are invalid.");
  const input = raw as Record<string, unknown>;

  if (!isStringArray(input.allergyTags) || !isStringArray(input.avoidedFoodIds)) {
    return failure("Preference details are invalid.");
  }
  const allergyTags = [...new Set(input.allergyTags)];
  if (allergyTags.some((tag) => !offeredTags.includes(tag))) {
    return failure("Choose only the allergy options shown.");
  }

  const avoidedFoodIds = [...new Set(input.avoidedFoodIds)];
  if (avoidedFoodIds.some((id) => !uuidPattern.test(id))) {
    return failure("Choose foods from the list.");
  }

  const experience = experiences.find((value) => value === input.experience);
  if (!experience) return failure("Choose beginner or intermediate.");
  const equipment = equipmentOptions.find((value) => value === input.equipment);
  if (!equipment) return failure("Choose your equipment.");

  const trainingDays = input.trainingDays;
  if (typeof trainingDays !== "number" || !trainingDayOptions(experience).includes(trainingDays)) {
    const { min, max } = trainingDayRanges[experience];
    return failure(`Training days must be a whole number from ${min} to ${max} for ${experience}.`);
  }

  return {
    ok: true,
    data: {
      allergy_tags: allergyTags as DietTag[],
      avoided_food_ids: avoidedFoodIds,
      experience,
      equipment,
      training_days: trainingDays,
    },
  };
}

export function diffAvoidedFoods(current: string[], next: string[]): { toAdd: string[]; toRemove: string[] } {
  const currentSet = new Set(current);
  const nextSet = new Set(next);
  return {
    toAdd: next.filter((id) => !currentSet.has(id)),
    toRemove: current.filter((id) => !nextSet.has(id)),
  };
}
