import type { Result } from "@/lib/calc/calculate";
import { calculationConfig, type PortionClass } from "@/lib/calc/config";
import {
  addTotals,
  isCalendarDate,
  itemNutrition,
  maxMealItemGrams,
  mealTotals,
  type MealItemNutrition,
  type MealTotals,
  type NutritionPer100g,
} from "@/lib/meal";
import { mealLabels } from "@/lib/meal-slots";
import {
  isExcluded,
  remainingTargets,
  suggestionRoles,
  type DailyTargets,
  type Exclusions,
  type Remaining,
  type SuggestableFood,
  type SuggestionRole,
} from "@/lib/suggestions";
import { addDays } from "@/lib/week";

// Rule-based and deterministic: the same inputs always give the same plan.
// Spec: docs/MEAL-PLANNER.md "Plan rules" and "Realistic portions".
const limits = calculationConfig.meal_planner;
const kcalPerGram = calculationConfig.macros.kcal_per_gram;

export const plannerGroups = suggestionRoles;
export type PlannerGroup = SuggestionRole;

export const plannerRotations = ["same", "mix", "alternate"] as const;
export type Rotation = (typeof plannerRotations)[number];

export type MacroBudget = { protein_g: number; carbs_g: number; fat_g: number };
type MacroKey = keyof MacroBudget;

// A food the planner can use: catalog values plus its portion class (MP-7).
export type PlannerFood = SuggestableFood & { portion_class: PortionClass | null; portion_unit_g: number | null };

// Meals already saved on a date: their labels and their combined totals.
export type LoggedDay = { labels: readonly string[]; totals: MealTotals };

export type MealPlanInput<T extends PlannerFood> = {
  startDate: string;
  // 1 is a day plan, which always mixes. More is a week plan.
  days: number;
  // The day's total, logged meals included.
  mealsPerDay: number;
  targets: DailyTargets;
  foods: Record<PlannerGroup, readonly T[]>;
  rotations: Record<PlannerGroup, Rotation>;
  exclusions: Exclusions;
  logged: Readonly<Record<string, LoggedDay | undefined>>;
};

export type PlannedItem<T extends PlannerFood> = {
  group: PlannerGroup;
  food: T;
  grams: number;
  // Whole units for unit classes (eggs, scoops, slices), otherwise null.
  units: number | null;
  nutrition: MealItemNutrition;
};

export type PlannedMeal<T extends PlannerFood> = {
  label: string;
  // A shake holds only powder foods and tops up the day's protein.
  kind: "meal" | "shake";
  budget: MacroBudget;
  items: PlannedItem<T>[];
  totals: MealTotals;
};

// "met": no calories left. "meals_logged": the day already has the chosen number of meals.
// Logged meals count toward the total, so there are always enough free labels for the meals left.
export type PlannedDay<T extends PlannerFood> = {
  date: string;
  status: "planned" | "met" | "meals_logged";
  remaining: Remaining;
  budget: MacroBudget;
  meals: PlannedMeal<T>[];
  // Planned meals only. Logged meals are not included.
  totals: MealTotals;
  notes: string[];
};

// A food's portion range per meal, in grams. unit_g is set for classes counted in whole units.
export type PortionRange = { min_g: number; max_g: number; step_g: number; unit_g: number | null };

const macroKeys = ["protein_g", "carbs_g", "fat_g"] as const satisfies readonly MacroKey[];
const groupMacro: Record<PlannerGroup, MacroKey> = { protein: "protein_g", carb: "carbs_g", fat: "fat_g" };
const groupWord: Record<PlannerGroup, string> = { protein: "protein", carb: "carb", fat: "fat" };
const macroLabel: Record<MacroKey, string> = { protein_g: "Protein is", carbs_g: "Carbs are", fat_g: "Fat is" };
const macroWord: Record<MacroKey, string> = { protein_g: "protein", carbs_g: "carbs", fat_g: "fat" };
// Errors are weighed in kcal, so a gram of fat counts more than a gram of protein or carbs.
const macroWeights = [kcalPerGram.protein, kcalPerGram.carbohydrate, kcalPerGram.fat];

const emptyTotals = (): MealTotals => mealTotals([]);

export function portionRange(food: Pick<PlannerFood, "portion_class" | "portion_unit_g">): PortionRange | null {
  if (!food.portion_class) return null;
  const portion = limits.portions[food.portion_class];
  if ("step_g" in portion) return { min_g: portion.min_g, max_g: portion.max_g, step_g: portion.step_g, unit_g: null };
  const unit = food.portion_unit_g;
  if (!unit || unit <= 0) return null;
  return { min_g: portion.min_units * unit, max_g: portion.max_units * unit, step_g: unit, unit_g: unit };
}

// Powders (whey) are only planned as a shake, never as part of a meal.
function isPowder(food: PlannerFood): boolean {
  return food.portion_class === "powder";
}

function macroColumn(food: NutritionPer100g): number[] {
  return [food.protein_g_per_100g, food.carbs_g_per_100g, food.fat_g_per_100g];
}

// Solves M x = r by Gaussian elimination. Returns null when the system has no single answer.
function solveLinear(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]]);
  const scale = Math.max(...matrix.map((row, i) => Math.abs(row[i])));
  if (scale === 0) return null;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < scale * 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col] / a[col][col];
      for (let k = col; k <= n; k++) a[row][k] -= factor * a[col][k];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

// Weighted least squares for the free foods, after the fixed foods are taken off the target.
function leastSquares(columns: number[][], target: number[]): number[] | null {
  const matrix = columns.map((ci) =>
    columns.map((cj) => macroWeights.reduce((sum, w, m) => sum + w * w * ci[m] * cj[m], 0)),
  );
  const rhs = columns.map((ci) => macroWeights.reduce((sum, w, m) => sum + w * w * ci[m] * target[m], 0));
  return solveLinear(matrix, rhs);
}

function weightedError(columns: number[][], amounts: number[], target: number[]): number {
  return macroWeights.reduce((sum, w, m) => {
    const planned = columns.reduce((total, column, j) => total + column[m] * amounts[j], 0);
    return sum + (w * (planned - target[m])) ** 2;
  }, 0);
}

const off = 0;
const atMin = 1;
const atMax = 2;
const free = 3;

// Grams (unrounded) for each food so protein, carbs, and fat come as close as possible to the budget,
// with each food either left out (0 g) or kept within its range. The best fit is one where every food
// is off, at its minimum, at its maximum, or free in between, so trying each of those four states for
// every food finds it. Ties keep more foods.
export function solvePortions(
  foods: readonly NutritionPer100g[],
  ranges: readonly Pick<PortionRange, "min_g" | "max_g">[],
  budget: MacroBudget,
): number[] {
  const target = macroKeys.map((key) => budget[key]);
  // Columns are per 100 g, so amounts are in units of 100 g.
  const columns = foods.map(macroColumn);
  const low = ranges.map((range) => range.min_g / 100);
  const high = ranges.map((range) => range.max_g / 100);
  const count = foods.length;
  let best = { amounts: foods.map(() => 0), error: weightedError(columns, foods.map(() => 0), target), used: 0 };

  for (let code = 1; code < 4 ** count; code++) {
    const states = Array.from({ length: count }, (_, index) => Math.floor(code / 4 ** index) % 4);
    const amounts = states.map((state, index) => (state === atMin ? low[index] : state === atMax ? high[index] : 0));
    const freeIndexes = states.flatMap((state, index) => (state === free ? [index] : []));
    if (freeIndexes.length > 0) {
      const rest = target.map((value, m) => value - columns.reduce((sum, column, j) => sum + column[m] * amounts[j], 0));
      const solved = leastSquares(
        freeIndexes.map((index) => columns[index]),
        rest,
      );
      if (!solved) continue;
      const fits = freeIndexes.every((index, j) => solved[j] >= low[index] - 1e-9 && solved[j] <= high[index] + 1e-9);
      if (!fits) continue;
      freeIndexes.forEach((index, j) => (amounts[index] = Math.min(high[index], Math.max(low[index], solved[j]))));
    }
    const error = weightedError(columns, amounts, target);
    const used = states.filter((state) => state !== off).length;
    const tolerance = 1e-9 * Math.max(1, best.error);
    if (error < best.error - tolerance || (Math.abs(error - best.error) <= tolerance && used > best.used)) {
      best = { amounts, error, used };
    }
  }
  return best.amounts.map((amount) => amount * 100);
}

// Rounds to the class step (whole units for unit classes), within the range. 0 stays 0.
export function roundPortion(range: PortionRange, grams: number): number {
  if (grams <= 0) return 0;
  const steps = Math.round(grams / range.step_g);
  const rounded = Math.min(range.max_g, Math.max(range.min_g, steps * range.step_g));
  return Math.min(Math.round(rounded * 100) / 100, maxMealItemGrams);
}

export function pickIndex(count: number, rotation: Rotation, dayIndex: number, mealIndex: number): number | null {
  if (count === 0) return null;
  if (rotation === "same") return 0;
  if (rotation === "alternate") return dayIndex % count;
  return mealIndex % count;
}

export function pickFood<T>(foods: readonly T[], rotation: Rotation, dayIndex: number, mealIndex: number): T | null {
  const index = pickIndex(foods.length, rotation, dayIndex, mealIndex);
  return index === null ? null : foods[index];
}

function validateInput<T extends PlannerFood>(input: MealPlanInput<T>): string | null {
  if (!isCalendarDate(input.startDate)) return "Choose a valid start date.";
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > limits.max_days) {
    return `Plan between 1 and ${limits.max_days} days.`;
  }
  const { min, max } = limits.meals_per_day;
  if (!Number.isInteger(input.mealsPerDay) || input.mealsPerDay < min || input.mealsPerDay > max) {
    return `Choose between ${min} and ${max} meals per day.`;
  }

  const seen = new Set<string>();
  for (const group of plannerGroups) {
    if (!plannerRotations.includes(input.rotations[group])) return "Choose a valid rotation.";
    const foods = input.foods[group];
    if (foods.length > limits.max_foods_per_group) {
      return `Pick at most ${limits.max_foods_per_group} ${groupWord[group]} foods.`;
    }
    for (const food of foods) {
      if (food.role !== group) return `${food.name} is not a ${groupWord[group]} food.`;
      if (seen.has(food.id)) return `${food.name} is picked more than once.`;
      if (isExcluded(food, input.exclusions)) return `${food.name} matches an allergy or avoided food in your preferences.`;
      if (!portionRange(food)) return `${food.name} cannot be planned yet.`;
      seen.add(food.id);
    }
  }
  if (seen.size === 0) return "Pick at least one food.";
  return null;
}

type Chosen<T extends PlannerFood> = { group: PlannerGroup; food: T; range: PortionRange };

function itemFor<T extends PlannerFood>(group: PlannerGroup, food: T, range: PortionRange, grams: number): PlannedItem<T> {
  return {
    group,
    food,
    grams,
    units: range.unit_g === null ? null : Math.round(grams / range.unit_g),
    nutrition: itemNutrition(food.nutrition, grams),
  };
}

function totalsOf<T extends PlannerFood>(items: readonly PlannedItem<T>[]): MealTotals {
  return mealTotals(items.map(({ food, grams }) => ({ food: food.nutrition, grams })));
}

type Solver = (chosen: readonly Chosen<PlannerFood>[], budget: MacroBudget) => number[];

// The same foods and budget always give the same grams, so repeated meals are solved once.
function memoSolver(): Solver {
  const cache = new Map<string, number[]>();
  return (chosen, budget) => {
    const key = `${chosen.map((entry) => entry.food.id).join(",")}|${budget.protein_g}|${budget.carbs_g}|${budget.fat_g}`;
    let grams = cache.get(key);
    if (!grams) {
      grams = solvePortions(
        chosen.map((entry) => entry.food.nutrition),
        chosen.map((entry) => entry.range),
        budget,
      );
      cache.set(key, grams);
    }
    return grams;
  };
}

// Foods a normal meal can use from one group: every pick except powders.
function mealFoods<T extends PlannerFood>(input: MealPlanInput<T>, group: PlannerGroup): T[] {
  return input.foods[group].filter((food) => !isPowder(food));
}

function buildMeal<T extends PlannerFood>(
  input: MealPlanInput<T>,
  solve: Solver,
  label: string,
  budget: MacroBudget,
  dayIndex: number,
  mealIndex: number,
): PlannedMeal<T> {
  const chosen: Chosen<T>[] = [];
  const picked: Partial<Record<PlannerGroup, number>> = {};
  for (const group of plannerGroups) {
    const foods = mealFoods(input, group);
    const rotation = input.days === 1 ? "mix" : input.rotations[group];
    const index = pickIndex(foods.length, rotation, dayIndex, mealIndex);
    if (index === null) continue;
    picked[group] = index;
    chosen.push({ group, food: foods[index], range: portionRange(foods[index])! });
  }

  let grams = solve(chosen, budget);
  // Second food: a food at its maximum while its group's macro is still short gets help from the
  // next picked food of that group.
  const added: Chosen<T>[] = [];
  chosen.forEach((entry, index) => {
    const foods = mealFoods(input, entry.group);
    const first = picked[entry.group]!;
    if (foods.length < 2 || limits.max_foods_per_group_per_meal < 2) return;
    if (grams[index] < entry.range.max_g - 1e-6) return;
    const key = groupMacro[entry.group];
    const planned = chosen.reduce((sum, other, j) => sum + (other.food.nutrition[`${key}_per_100g` as const] * grams[j]) / 100, 0);
    if (planned >= budget[key] * (1 - limits.note_tolerance_fraction)) return;
    const next = foods[(first + 1) % foods.length];
    added.push({ group: entry.group, food: next, range: portionRange(next)! });
  });
  const all = [...chosen, ...added];
  if (added.length > 0) grams = solve(all, budget);

  const items: PlannedItem<T>[] = [];
  // Keep foods of one group together: protein, carb, fat.
  const order = plannerGroups.flatMap((group) => all.flatMap((entry, index) => (entry.group === group ? [index] : [])));
  for (const index of order) {
    const { group, food, range } = all[index];
    const rounded = roundPortion(range, grams[index]);
    if (rounded > 0) items.push(itemFor(group, food, range, rounded));
  }
  return { label, kind: "meal", budget, items, totals: totalsOf(items) };
}

// A whey shake when the day's protein is still short: whole scoops, the closer fit, at most the class maximum.
function buildShake<T extends PlannerFood>(input: MealPlanInput<T>, label: string, shortGrams: number): PlannedMeal<T> | null {
  const powder = input.foods.protein.find(isPowder);
  if (!powder) return null;
  const range = portionRange(powder)!;
  const unit = range.unit_g!;
  const proteinPerUnit = (powder.nutrition.protein_g_per_100g * unit) / 100;
  if (proteinPerUnit <= 0) return null;
  let units = range.min_g / unit;
  for (let candidate = units; candidate <= range.max_g / unit; candidate++) {
    if (Math.abs(shortGrams - candidate * proteinPerUnit) < Math.abs(shortGrams - units * proteinPerUnit)) units = candidate;
  }
  const item = itemFor("protein", powder, range, Math.round(units * unit * 100) / 100);
  return { label, kind: "shake", budget: { protein_g: shortGrams, carbs_g: 0, fat_g: 0 }, items: [item], totals: totalsOf([item]) };
}

function listNames(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Foods of a group in normal meals, if every one of them sits at the given end of its range in every meal.
function foodsAtLimit<T extends PlannerFood>(items: PlannedItem<T>[], end: "min_g" | "max_g"): T[] | null {
  if (items.length === 0) return null;
  const atLimit = items.every((item) => Math.abs(item.grams - portionRange(item.food)![end]) < 1e-6);
  if (!atLimit) return null;
  return [...new Map(items.map((item) => [item.food.id, item.food])).values()];
}

function portionText(food: PlannerFood, end: "min_g" | "max_g"): string {
  const range = portionRange(food)!;
  return range.unit_g === null ? `${range[end]} g` : `${range[end] / range.unit_g} × ${range.unit_g} g`;
}

// A note for each macro more than 10% from the day's budget, saying why and what to add.
function planNotes<T extends PlannerFood>(
  input: MealPlanInput<T>,
  budget: MacroBudget,
  meals: PlannedMeal<T>[],
  shakeBlocked: boolean,
): string[] {
  const notes: string[] = [];
  const items = meals.flatMap((meal) => meal.items);
  const mealItems = meals.filter((meal) => meal.kind === "meal").flatMap((meal) => meal.items);
  for (const group of plannerGroups) {
    const key = groupMacro[group];
    const planned = items.reduce((sum, item) => sum + item.nutrition[key], 0);
    const diff = planned - budget[key];
    const grams = Math.round(Math.abs(diff));
    if (grams === 0 || Math.abs(diff) <= budget[key] * limits.note_tolerance_fraction) continue;
    const own = mealItems.filter((item) => item.group === group);

    if (diff < 0) {
      const start = `${macroLabel[key]} ${grams} g short.`;
      if (input.foods[group].length === 0) {
        notes.push(`${start} Add a ${groupWord[group]} food.`);
        continue;
      }
      const full = foodsAtLimit(own, "max_g");
      const where = full
        ? full.length === 1
          ? ` ${full[0].name} is at its largest portion (${portionText(full[0], "max_g")}) in every meal.`
          : ` ${listNames(full.map((food) => food.name))} are at their largest portions in every meal.`
        : "";
      const shake = group === "protein" && shakeBlocked ? " No meal label is free for a whey shake." : "";
      notes.push(`${start}${where}${shake} Add another ${groupWord[group]} food or more meals.`);
      continue;
    }

    const start = `${macroLabel[key]} ${grams} g over.`;
    const smallest = foodsAtLimit(own, "min_g");
    if (smallest && smallest.length === 1) {
      notes.push(`${start} ${smallest[0].name} is at its smallest portion (${portionText(smallest[0], "min_g")}) in every meal.`);
      continue;
    }
    // Name the other group that brings the most of this macro.
    let source: { group: PlannerGroup; grams: number } | null = null;
    for (const other of plannerGroups) {
      if (other === group) continue;
      const from = items.filter((item) => item.group === other).reduce((sum, item) => sum + item.nutrition[key], 0);
      if (from > 0 && (!source || from > source.grams)) source = { group: other, grams: from };
    }
    if (!source) {
      notes.push(start);
      continue;
    }
    const sourceGroup = source.group;
    const foodCount = new Set(items.filter((item) => item.group === sourceGroup).map((item) => item.food.id)).size;
    const foods = foodCount > 1 ? "foods have" : "food has";
    notes.push(`${start.slice(0, -1)} because your ${groupWord[sourceGroup]} ${foods} ${macroWord[key]}.`);
  }
  return notes;
}

function buildDay<T extends PlannerFood>(input: MealPlanInput<T>, solve: Solver, dayIndex: number): PlannedDay<T> {
  const date = addDays(input.startDate, dayIndex);
  const logged = input.logged[date];
  const remaining = remainingTargets(input.targets, logged?.totals ?? emptyTotals());
  // A macro already over target gets no more grams. It is never planned below zero.
  const budget: MacroBudget = {
    protein_g: Math.max(0, remaining.protein_g),
    carbs_g: Math.max(0, remaining.carbs_g),
    fat_g: Math.max(0, remaining.fat_g),
  };
  const day = { date, remaining, budget, meals: [], totals: emptyTotals(), notes: [] };

  if (remaining.kcal <= 0) return { ...day, status: "met" };
  const usedLabels = logged?.labels ?? [];
  // Meals per day is the day's total, so logged meals count toward it.
  const toPlan = input.mealsPerDay - usedLabels.length;
  if (toPlan <= 0) {
    const count = usedLabels.length;
    const meals = count === 1 ? "1 meal is" : `${count} meals are`;
    const note = `${meals} already logged and ${Math.round(remaining.kcal)} kcal are left. Raise meals per day to plan more.`;
    return { ...day, status: "meals_logged", notes: [note] };
  }
  const freeLabels = mealLabels.filter((label) => !usedLabels.includes(label));

  const labels = freeLabels.slice(0, toPlan);
  // Each meal gets an equal share of the day's budget.
  const mealBudget: MacroBudget = {
    protein_g: budget.protein_g / labels.length,
    carbs_g: budget.carbs_g / labels.length,
    fat_g: budget.fat_g / labels.length,
  };
  const meals = labels
    .map((label, mealIndex) => buildMeal(input, solve, label, mealBudget, dayIndex, mealIndex))
    .filter((meal) => meal.items.length > 0);

  // Whey tops up protein after the meals, under the next free label.
  let shakeBlocked = false;
  const proteinShort = budget.protein_g - meals.reduce((sum, meal) => sum + meal.totals.protein_g, 0);
  if (proteinShort > budget.protein_g * limits.note_tolerance_fraction && input.foods.protein.some(isPowder)) {
    const shakeLabel = freeLabels[labels.length];
    const shake = shakeLabel ? buildShake(input, shakeLabel, proteinShort) : null;
    if (shake) meals.push(shake);
    else shakeBlocked = !shakeLabel;
  }

  const totals = meals.reduce((sum, meal) => addTotals(sum, meal.totals), emptyTotals());
  return { ...day, status: "planned", meals, totals, notes: planNotes(input, budget, meals, shakeBlocked) };
}

export function buildMealPlan<T extends PlannerFood>(input: MealPlanInput<T>): Result<PlannedDay<T>[]> {
  const error = validateInput(input);
  if (error) return { ok: false, error };
  const solve = memoSolver();
  return { ok: true, data: Array.from({ length: input.days }, (_, dayIndex) => buildDay(input, solve, dayIndex)) };
}
