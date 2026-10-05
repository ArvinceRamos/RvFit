import { describe, expect, it } from "vitest";
import { calculationConfig } from "@/lib/calc/config";
import { equipmentOptions } from "@/lib/preferences";
import { equipmentAllows, exercises, getExercise, patternList } from "./exercises";
import { splits } from "./splits";
import {
  allTemplateCombinations,
  applySwaps,
  resolveTemplate,
  resolveTemplateByKey,
  swapOptions,
  templateKey,
  type Template,
} from "./templates";
import { movementPatterns } from "./types";

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function resolved(level: string, days: number, equipment: string): Template {
  const template = resolveTemplate(level, days, equipment);
  if (!template) throw new Error(`No template for ${level} ${days} ${equipment}`);
  return template;
}

describe("exercise content", () => {
  it("has unique kebab-case keys", () => {
    const keys = exercises.map((exercise) => exercise.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(kebab);
  });

  it("has a reasonable number of exercises and every pattern is used", () => {
    expect(exercises.length).toBeGreaterThanOrEqual(70);
    expect(exercises.length).toBeLessThanOrEqual(100);
    for (const pattern of movementPatterns) {
      expect(exercises.some((exercise) => exercise.pattern === pattern)).toBe(true);
    }
  });

  it("gives every pattern at least 2 options at every tier", () => {
    for (const pattern of movementPatterns) {
      for (const tier of equipmentOptions) {
        expect(patternList(pattern, tier).length, `${pattern} ${tier}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("lists higher tiers first and includes lower tiers", () => {
    const list = patternList("horizontal_push", "gym");
    expect(list[0].equipment).toBe("gym");
    expect(list.some((exercise) => exercise.equipment === "bodyweight")).toBe(true);
    expect(patternList("horizontal_push", "bodyweight").every((exercise) => exercise.equipment === "bodyweight")).toBe(true);
    expect(patternList("horizontal_push", "dumbbell_only").every((exercise) => equipmentAllows("dumbbell_only", exercise.equipment))).toBe(true);
  });

  it("finds exercises by key", () => {
    expect(getExercise("push-up")?.name).toBe("Push-up");
    expect(getExercise("not-an-exercise")).toBeUndefined();
  });

  it("keeps unloaded exercises free of weight and holds measured in seconds", () => {
    for (const exercise of exercises) {
      if (exercise.equipment === "bodyweight") {
        expect(exercise.loaded, exercise.key).toBe(false);
      }
    }
    expect(getExercise("plank")?.measure).toBe("seconds");
    expect(getExercise("push-up")?.measure).toBe("reps");
  });
});

describe("splits", () => {
  it("has the five shared splits with the planned day keys", () => {
    expect(splits.map((split) => [split.key, split.trainingDays, split.days.map((day) => day.key)])).toEqual([
      ["full-body-ab", 2, ["a", "b"]],
      ["full-body-abc", 3, ["a", "b", "c"]],
      ["upper-lower", 4, ["upper-a", "lower-a", "upper-b", "lower-b"]],
      ["ppl-upper-lower", 5, ["push", "pull", "legs", "upper", "lower"]],
      ["ppl-twice", 6, ["push-a", "pull-a", "legs-a", "push-b", "pull-b", "legs-b"]],
    ]);
  });

  it("has kebab-case unique keys and schemes inside the configured bounds", () => {
    for (const split of splits) {
      expect(split.key).toMatch(kebab);
      const slotKeys = split.days.flatMap((day) => day.slots.map((slot) => slot.key));
      expect(new Set(slotKeys).size, split.key).toBe(slotKeys.length);
      for (const day of split.days) {
        expect(day.key).toMatch(kebab);
        for (const slot of day.slots) {
          expect(slot.key).toMatch(kebab);
          for (const level of ["beginner", "intermediate"] as const) {
            const scheme = slot[level];
            if (!scheme) continue;
            const bounds = calculationConfig.workouts.schemes[level];
            expect(scheme.sets).toBeGreaterThanOrEqual(bounds.sets.min);
            expect(scheme.sets).toBeLessThanOrEqual(bounds.sets.max);
            expect(scheme.reps.min).toBeGreaterThanOrEqual(bounds.reps.min);
            expect(scheme.reps.max).toBeLessThanOrEqual(bounds.reps.max);
            expect(scheme.reps.min).toBeLessThan(scheme.reps.max);
            expect(scheme.restSeconds).toBeGreaterThanOrEqual(bounds.rest_seconds.min);
            expect(scheme.restSeconds).toBeLessThanOrEqual(bounds.rest_seconds.max);
          }
        }
      }
    }
  });

  it("gives every day a beginner and an intermediate scheme", () => {
    for (const split of splits) {
      for (const day of split.days) {
        expect(day.slots.filter((slot) => slot.beginner).length, split.key + " " + day.key).toBeGreaterThanOrEqual(4);
        expect(day.slots.filter((slot) => slot.intermediate).length, split.key + " " + day.key).toBeGreaterThanOrEqual(5);
      }
    }
  });
});

describe("template keys and resolver", () => {
  it("has 30 valid combinations: 15 beginner and 15 intermediate", () => {
    expect(allTemplateCombinations).toHaveLength(30);
    expect(allTemplateCombinations.filter((item) => item.level === "beginner")).toHaveLength(15);
    expect(allTemplateCombinations.filter((item) => item.level === "intermediate")).toHaveLength(15);
  });

  it("builds keys as <split>.<level>.<equipment>", () => {
    expect(templateKey("beginner", 3, "dumbbell_only")).toBe("full-body-abc.beginner.dumbbell_only");
    expect(templateKey("intermediate", 6, "gym")).toBe("ppl-twice.intermediate.gym");
  });

  it("returns null for invalid combinations", () => {
    expect(resolveTemplate("beginner", 7, "gym")).toBeNull();
    expect(resolveTemplate("beginner", 0, "bodyweight")).toBeNull();
    expect(resolveTemplate("beginner", 1, "gym")).toBeNull();
    expect(resolveTemplate("intermediate", 7, "gym")).toBeNull();
    expect(resolveTemplate("advanced", 3, "gym")).toBeNull();
    expect(resolveTemplate("beginner", 3, "barbell")).toBeNull();
    expect(resolveTemplate("beginner", 2.5, "gym")).toBeNull();
    expect(templateKey("beginner", 7, "gym")).toBeNull();
    expect(templateKey("beginner", 5, "gym")).toBe("ppl-upper-lower.beginner.gym");
  });

  it("round-trips a stored key and rejects bad keys", () => {
    for (const { level, days, equipment } of allTemplateCombinations) {
      const key = templateKey(level, days, equipment) as string;
      expect(resolveTemplateByKey(key)?.key).toBe(key);
    }
    for (const bad of ["", "full-body-abc", "nope.beginner.gym", "full-body-abc.beginner.gym.extra", "full-body-ab.beginner.barbell"]) {
      expect(resolveTemplateByKey(bad), bad).toBeNull();
    }
  });

  describe.each(allTemplateCombinations)("$level, $days days, $equipment", ({ level, days, equipment }) => {
    const template = resolved(level, days, equipment);
    const split = splits.find((item) => item.trainingDays === days)!;

    it("has every day, with the planned number of slots", () => {
      expect(template.days.map((day) => day.key)).toEqual(split.days.map((day) => day.key));
      template.days.forEach((day, index) => {
        const planned = split.days[index].slots.filter((slot) => slot[level]);
        expect(day.slots.map((slot) => slot.key)).toEqual(planned.map((slot) => slot.key));
      });
    });

    it("uses exercises the equipment tier allows, of the right pattern, not retired", () => {
      for (const day of template.days) {
        for (const slot of day.slots) {
          expect(equipmentAllows(equipment, slot.exercise.equipment), slot.key).toBe(true);
          expect(slot.exercise.pattern).toBe(slot.pattern);
          expect(slot.exercise.retired).toBeFalsy();
        }
      }
    });

    it("never repeats an exercise within a day", () => {
      for (const day of template.days) {
        const keys = day.slots.map((slot) => slot.exercise.key);
        expect(new Set(keys).size, day.key).toBe(keys.length);
      }
    });

    it("keeps day sizes in the level's range", () => {
      for (const day of template.days) {
        if (level === "beginner") {
          expect(day.slots.length).toBeGreaterThanOrEqual(4);
          expect(day.slots.length).toBeLessThanOrEqual(5);
        } else {
          expect(day.slots.length).toBeGreaterThanOrEqual(5);
          expect(day.slots.length).toBeLessThanOrEqual(7);
        }
      }
    });

    it("uses hold ranges for seconds exercises and rep ranges otherwise", () => {
      const bounds = calculationConfig.workouts.schemes[level];
      for (const day of template.days) {
        for (const slot of day.slots) {
          const range = slot.exercise.measure === "seconds" ? bounds.hold_seconds : bounds.reps;
          expect(slot.scheme.reps.min, slot.key).toBeGreaterThanOrEqual(range.min);
          expect(slot.scheme.reps.max, slot.key).toBeLessThanOrEqual(range.max);
        }
      }
    });

    it("offers a swap for every slot that the tier allows", () => {
      for (const day of template.days) {
        for (const slot of day.slots) {
          const options = swapOptions(template, slot.key);
          const sameDay = day.slots.filter((item) => item.pattern === slot.pattern).length;
          const tierSize = patternList(slot.pattern, equipment).length;
          if (tierSize > sameDay) expect(options.length, slot.key).toBeGreaterThanOrEqual(1);
          for (const option of options) {
            expect(option.pattern).toBe(slot.pattern);
            expect(equipmentAllows(equipment, option.equipment)).toBe(true);
            expect(day.slots.some((item) => item.exercise.key === option.key)).toBe(false);
          }
        }
      }
    });
  });
});

describe("swaps", () => {
  const template = resolved("beginner", 3, "gym");
  const slot = template.days[0].slots[1]; // a-horizontal-push-1
  const option = swapOptions(template, slot.key)[0];

  it("replaces one slot and keeps the rest", () => {
    const swapped = applySwaps(template, [{ slotKey: slot.key, exerciseKey: option.key }]);
    expect(swapped.days[0].slots[1].exercise.key).toBe(option.key);
    expect(swapped.days[0].slots[0]).toEqual(template.days[0].slots[0]);
    expect(template.days[0].slots[1].exercise.key).not.toBe(option.key);
  });

  it("ignores stale swaps: unknown slot, unknown exercise, wrong pattern, wrong tier, used that day", () => {
    const bodyweight = resolved("beginner", 3, "bodyweight");
    const sameDayKey = template.days[0].slots[0].exercise.key;
    const stale = [
      { slotKey: "nope", exerciseKey: option.key },
      { slotKey: slot.key, exerciseKey: "nope" },
      { slotKey: slot.key, exerciseKey: "plank" },
      { slotKey: slot.key, exerciseKey: sameDayKey },
    ];
    expect(applySwaps(template, stale)).toEqual(template);
    expect(applySwaps(bodyweight, [{ slotKey: bodyweight.days[0].slots[1].key, exerciseKey: "barbell-bench-press" }])).toEqual(bodyweight);
  });

  it("changes the plan for a seconds exercise to hold seconds and back", () => {
    const core = template.days[0].slots[3]; // a-core-1
    const plank = { slotKey: core.key, exerciseKey: "plank" };
    const swapped = applySwaps(template, [plank]);
    const hold = calculationConfig.workouts.schemes.beginner.hold_seconds;
    expect(swapped.days[0].slots[3].scheme.reps).toEqual({ min: hold.min, max: hold.max });
    const back = applySwaps(swapped, [{ slotKey: core.key, exerciseKey: "dead-bug" }]);
    expect(back.days[0].slots[3].scheme.reps).toEqual(core.baseScheme.reps);
  });

  it("returns no options for an unknown slot", () => {
    expect(swapOptions(template, "nope")).toEqual([]);
  });
});
