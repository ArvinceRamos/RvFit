import { describe, expect, it } from "vitest";
import { orderSwaps, validateResetRequest, validateSwapRequest } from "./swaps";
import { applySwaps, resolveTemplate, swapOptions } from "./templates";

const template = resolveTemplate("beginner", 3, "gym")!;
const key = template.key;
const squatSlot = template.days[0].slots[0];
const squatOption = swapOptions(template, squatSlot.key)[0];

describe("orderSwaps", () => {
  it("sorts oldest first and keeps slot order for ties", () => {
    const rows = [
      { slot_key: "b", exercise_key: "x", updated_at: "2026-10-02T00:00:00Z" },
      { slot_key: "c", exercise_key: "y", updated_at: "2026-10-01T00:00:00Z" },
      { slot_key: "a", exercise_key: "z", updated_at: "2026-10-01T00:00:00Z" },
    ];
    expect(orderSwaps(rows).map((swap) => swap.slotKey)).toEqual(["a", "c", "b"]);
  });
});

describe("validateSwapRequest", () => {
  it("accepts a valid option", () => {
    expect(validateSwapRequest({ templateKey: key, slotKey: squatSlot.key, exerciseKey: squatOption.key }, [])).toEqual({
      ok: true,
      data: { templateKey: key, slotKey: squatSlot.key, exerciseKey: squatOption.key },
    });
  });

  it("rejects bad shapes, unknown keys, and other patterns or tiers", () => {
    for (const raw of [
      null,
      "x",
      {},
      { templateKey: key, slotKey: squatSlot.key },
      { templateKey: 1, slotKey: squatSlot.key, exerciseKey: squatOption.key },
      { templateKey: "nope", slotKey: squatSlot.key, exerciseKey: squatOption.key },
      { templateKey: key, slotKey: "nope", exerciseKey: squatOption.key },
      { templateKey: key, slotKey: squatSlot.key, exerciseKey: "nope" },
      { templateKey: key, slotKey: squatSlot.key, exerciseKey: "plank" },
    ]) {
      expect(validateSwapRequest(raw, []), JSON.stringify(raw)).toMatchObject({ ok: false });
    }
    const bodyweight = resolveTemplate("beginner", 3, "bodyweight")!;
    expect(
      validateSwapRequest({ templateKey: bodyweight.key, slotKey: bodyweight.days[0].slots[1].key, exerciseKey: "barbell-bench-press" }, []),
    ).toMatchObject({ ok: false });
  });

  it("rejects the default exercise and an exercise used elsewhere that day", () => {
    expect(validateSwapRequest({ templateKey: key, slotKey: squatSlot.key, exerciseKey: squatSlot.exercise.key }, [])).toMatchObject({ ok: false });
    const upper = resolveTemplate("intermediate", 5, "gym")!;
    const [first, second] = upper.days[0].slots.filter((slot) => slot.pattern === "horizontal_push");
    expect(
      validateSwapRequest({ templateKey: upper.key, slotKey: first.key, exerciseKey: second.exercise.key }, []),
    ).toMatchObject({ ok: false });
  });

  it("allows replacing the slot's own saved swap, and uses the other saved swaps", () => {
    const swapped = [{ slotKey: squatSlot.key, exerciseKey: squatOption.key }];
    const another = swapOptions(applySwaps(template, swapped), squatSlot.key).find((item) => item.key !== squatSlot.exercise.key)!;
    expect(
      validateSwapRequest({ templateKey: key, slotKey: squatSlot.key, exerciseKey: another.key }, swapped),
    ).toMatchObject({ ok: true });

    // Two push slots on one day: once the first is swapped to X, the second may not take X.
    const day = resolveTemplate("intermediate", 5, "gym")!;
    const [a, b] = day.days[0].slots.filter((slot) => slot.pattern === "horizontal_push");
    const x = swapOptions(day, a.key)[0];
    expect(
      validateSwapRequest({ templateKey: day.key, slotKey: b.key, exerciseKey: x.key }, [{ slotKey: a.key, exerciseKey: x.key }]),
    ).toMatchObject({ ok: false });
  });
});

describe("validateResetRequest", () => {
  it("accepts a real slot and rejects bad input", () => {
    expect(validateResetRequest({ templateKey: key, slotKey: squatSlot.key })).toMatchObject({ ok: true });
    expect(validateResetRequest({ templateKey: key, slotKey: "nope" })).toMatchObject({ ok: false });
    expect(validateResetRequest({ templateKey: "nope", slotKey: squatSlot.key })).toMatchObject({ ok: false });
    expect(validateResetRequest(null)).toMatchObject({ ok: false });
    expect(validateResetRequest({ templateKey: key })).toMatchObject({ ok: false });
  });
});
