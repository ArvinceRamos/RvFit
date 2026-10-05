import type { Result } from "@/lib/calc/calculate";
import { getExercise } from "./exercises";
import { applySwaps, resolveTemplateByKey, swapOptions, type Swap } from "./templates";

export type SwapRequest = { templateKey: string; slotKey: string; exerciseKey: string };
export type ResetRequest = { templateKey: string; slotKey: string };

type SavedSwapRow = { slot_key: string; exercise_key: string; updated_at: string };

// Apply saved swaps oldest first, so every part of the app resolves the same plan.
export function orderSwaps(rows: readonly SavedSwapRow[]): Swap[] {
  return [...rows]
    .sort((a, b) => a.updated_at.localeCompare(b.updated_at) || a.slot_key.localeCompare(b.slot_key))
    .map((row) => ({ slotKey: row.slot_key, exerciseKey: row.exercise_key }));
}

function failure(error: string): Result<never> {
  return { ok: false, error };
}

function readStrings(raw: unknown, names: string[]): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const name of names) {
    if (typeof input[name] !== "string") return null;
    values[name] = input[name];
  }
  return values;
}

function slotExists(templateKey: string, slotKey: string) {
  const template = resolveTemplateByKey(templateKey);
  const slot = template?.days.flatMap((day) => day.slots).find((item) => item.key === slotKey);
  return template && slot ? { template, slot } : null;
}

export function validateResetRequest(raw: unknown): Result<ResetRequest> {
  const input = readStrings(raw, ["templateKey", "slotKey"]);
  if (!input) return failure("Swap details are invalid.");
  if (!slotExists(input.templateKey, input.slotKey)) return failure("That exercise slot was not found.");
  return { ok: true, data: { templateKey: input.templateKey, slotKey: input.slotKey } };
}

// The chosen exercise must be a valid option once the user's other saved swaps are applied.
export function validateSwapRequest(raw: unknown, savedSwaps: readonly Swap[]): Result<SwapRequest> {
  const input = readStrings(raw, ["templateKey", "slotKey", "exerciseKey"]);
  if (!input) return failure("Swap details are invalid.");
  const found = slotExists(input.templateKey, input.slotKey);
  if (!found) return failure("That exercise slot was not found.");
  if (!getExercise(input.exerciseKey)) return failure("Choose an exercise from the list.");
  if (input.exerciseKey === found.slot.exercise.key) return failure("That is already the default. Use Reset to default.");

  const others = applySwaps(found.template, savedSwaps.filter((swap) => swap.slotKey !== input.slotKey));
  if (!swapOptions(others, input.slotKey).some((option) => option.key === input.exerciseKey)) {
    return failure("That exercise is not available for this slot.");
  }
  return { ok: true, data: { templateKey: input.templateKey, slotKey: input.slotKey, exerciseKey: input.exerciseKey } };
}
