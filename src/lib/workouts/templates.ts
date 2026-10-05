import { calculationConfig } from "@/lib/calc/config";
import { equipmentOptions, experiences, trainingDayOptions, type Equipment } from "@/lib/preferences";
import { getExercise, patternList } from "./exercises";
import { splits } from "./splits";
import type { Exercise, Level, MovementPattern, Scheme, Split } from "./types";

export type TemplateSlot = {
  key: string;
  pattern: MovementPattern;
  exercise: Exercise;
  /** Scheme as planned for this slot's exercise. For a seconds exercise the range is seconds. */
  scheme: Scheme;
  /** Scheme as written in the split, before any seconds adjustment. */
  baseScheme: Scheme;
};

export type TemplateDay = { key: string; name: string; slots: TemplateSlot[] };

export type Template = {
  key: string;
  splitKey: string;
  level: Level;
  equipment: Equipment;
  days: TemplateDay[];
};

export type Swap = { slotKey: string; exerciseKey: string };

function splitForDays(days: number): Split | undefined {
  return splits.find((split) => split.trainingDays === days);
}

/** Null when the combination is invalid, for example 7 days. */
export function templateKey(level: string, days: number, equipment: string): string | null {
  if (!experiences.includes(level as Level) || !equipmentOptions.includes(equipment as Equipment)) return null;
  if (!trainingDayOptions(level as Level).includes(days)) return null;
  const split = splitForDays(days);
  return split ? `${split.key}.${level}.${equipment}` : null;
}

// A seconds exercise uses the hold range for the level instead of the rep range.
export function schemeFor(base: Scheme, exercise: Exercise, level: Level): Scheme {
  if (exercise.measure === "reps") return base;
  const hold = calculationConfig.workouts.schemes[level].hold_seconds;
  return { ...base, reps: { min: hold.min, max: hold.max } };
}

export function resolveTemplate(level: string, days: number, equipment: string): Template | null {
  const key = templateKey(level, days, equipment);
  const split = splitForDays(days);
  if (!key || !split) return null;
  const typedLevel = level as Level;
  const typedEquipment = equipment as Equipment;

  const templateDays = split.days.map((splitDay): TemplateDay => {
    const used = new Set<string>();
    const slots: TemplateSlot[] = [];
    for (const slot of splitDay.slots) {
      const baseScheme = slot[typedLevel];
      if (!baseScheme) continue;
      const list = patternList(slot.pattern, typedEquipment);
      const picked = list[slot.pick];
      const exercise = picked && !used.has(picked.key) ? picked : list.find((item) => !used.has(item.key));
      if (!exercise) continue;
      used.add(exercise.key);
      slots.push({
        key: slot.key,
        pattern: slot.pattern,
        exercise,
        scheme: schemeFor(baseScheme, exercise, typedLevel),
        baseScheme,
      });
    }
    return { key: splitDay.key, name: splitDay.name, slots };
  });

  return { key, splitKey: split.key, level: typedLevel, equipment: typedEquipment, days: templateDays };
}

/** Resolve from a stored template key. Null when the key is not a valid template. */
export function resolveTemplateByKey(key: string): Template | null {
  const [splitKey, level, equipment, ...rest] = key.split(".");
  if (rest.length > 0 || !splitKey || !level || !equipment) return null;
  const split = splits.find((item) => item.key === splitKey);
  if (!split) return null;
  return resolveTemplate(level, split.trainingDays, equipment);
}

function findSlot(template: Template, slotKey: string): { day: TemplateDay; slot: TemplateSlot } | null {
  for (const day of template.days) {
    const slot = day.slots.find((item) => item.key === slotKey);
    if (slot) return { day, slot };
  }
  return null;
}

/** Other exercises of the same pattern that the tier allows, not retired, and not used elsewhere that day. */
export function swapOptions(template: Template, slotKey: string): Exercise[] {
  const found = findSlot(template, slotKey);
  if (!found) return [];
  const usedElsewhere = new Set(found.day.slots.filter((item) => item.key !== slotKey).map((item) => item.exercise.key));
  return patternList(found.slot.pattern, template.equipment).filter(
    (exercise) => exercise.key !== found.slot.exercise.key && !usedElsewhere.has(exercise.key),
  );
}

/** Apply saved swaps in order. A swap that is not a valid option any more is ignored. */
export function applySwaps(template: Template, swaps: readonly Swap[]): Template {
  let current = template;
  for (const swap of swaps) {
    const exercise = getExercise(swap.exerciseKey);
    if (!exercise) continue;
    const found = findSlot(current, swap.slotKey);
    if (!found || found.slot.exercise.key === exercise.key) continue;
    if (!swapOptions(current, swap.slotKey).some((option) => option.key === exercise.key)) continue;
    const level = current.level;
    current = {
      ...current,
      days: current.days.map((day) => ({
        ...day,
        slots: day.slots.map((slot) =>
          slot.key === swap.slotKey
            ? { ...slot, exercise, scheme: schemeFor(slot.baseScheme, exercise, level) }
            : slot,
        ),
      })),
    };
  }
  return current;
}

export const allTemplateCombinations: { level: Level; days: number; equipment: Equipment }[] = experiences.flatMap(
  (level) => trainingDayOptions(level).flatMap((days) => equipmentOptions.map((equipment) => ({ level, days, equipment }))),
);
