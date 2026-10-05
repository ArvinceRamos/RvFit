import type { MovementPattern, Scheme, Slot, Split, SplitDay } from "./types";

/**
 * PLACEHOLDER CONTENT pending qualified review. Do not present as reviewed.
 * Splits are shared by every level and equipment tier. A level with no scheme leaves the slot out.
 */
function scheme(sets: number, min: number, max: number, restSeconds: number): Scheme {
  return { sets, reps: { min, max }, restSeconds };
}

const beginnerMain = scheme(3, 8, 12, 90);
const beginnerLight = scheme(2, 10, 12, 60);
const heavy = scheme(4, 6, 10, 120);
const moderate = scheme(3, 8, 12, 90);
const light = scheme(3, 10, 12, 60);

type SlotSpec = [pattern: MovementPattern, pick: number, beginner: Scheme | null, intermediate: Scheme | null];

// Slot key: day key + pattern + count of that pattern so far in the day, e.g. "upper-a-horizontal-push-1".
function day(key: string, name: string, specs: SlotSpec[]): SplitDay {
  const counts = new Map<MovementPattern, number>();
  const slots = specs.map(([pattern, pick, beginner, intermediate]): Slot => {
    const count = (counts.get(pattern) ?? 0) + 1;
    counts.set(pattern, count);
    return {
      key: `${key}-${pattern.replace(/_/g, "-")}-${count}`,
      pattern,
      pick,
      ...(beginner ? { beginner } : {}),
      ...(intermediate ? { intermediate } : {}),
    };
  });
  return { key, name, slots };
}

export const splits: readonly Split[] = [
  {
    key: "full-body-ab",
    trainingDays: 2,
    days: [
      day("a", "Full body A", [
        ["squat", 0, beginnerMain, heavy],
        ["horizontal_push", 0, beginnerMain, heavy],
        ["horizontal_pull", 0, beginnerMain, heavy],
        ["vertical_push", 0, beginnerLight, moderate],
        ["core", 0, beginnerLight, light],
        ["triceps", 0, null, light],
      ]),
      day("b", "Full body B", [
        ["hinge", 0, beginnerMain, heavy],
        ["horizontal_push", 1, beginnerLight, moderate],
        ["vertical_pull", 0, beginnerMain, moderate],
        ["single_leg", 0, beginnerLight, moderate],
        ["core", 1, beginnerLight, light],
        ["biceps", 0, null, light],
        ["side_delt", 0, null, light],
      ]),
    ],
  },
  {
    key: "full-body-abc",
    trainingDays: 3,
    days: [
      day("a", "Full body A", [
        ["squat", 0, beginnerMain, heavy],
        ["horizontal_push", 0, beginnerMain, heavy],
        ["horizontal_pull", 0, beginnerMain, heavy],
        ["core", 0, beginnerLight, light],
        ["biceps", 0, null, light],
        ["triceps", 0, null, light],
      ]),
      day("b", "Full body B", [
        ["hinge", 0, beginnerMain, heavy],
        ["vertical_push", 0, beginnerMain, moderate],
        ["vertical_pull", 0, beginnerMain, moderate],
        ["single_leg", 0, beginnerLight, moderate],
        ["core", 1, beginnerLight, light],
        ["side_delt", 0, null, light],
        ["calves", 0, null, light],
      ]),
      day("c", "Full body C", [
        ["single_leg", 1, beginnerMain, moderate],
        ["hinge", 1, beginnerLight, moderate],
        ["horizontal_push", 1, beginnerMain, moderate],
        ["horizontal_pull", 1, beginnerMain, moderate],
        ["core", 2, beginnerLight, light],
        ["side_delt", 1, null, light],
        ["calves", 1, null, light],
      ]),
    ],
  },
  {
    key: "upper-lower",
    trainingDays: 4,
    days: [
      day("upper-a", "Upper A", [
        ["horizontal_push", 0, beginnerMain, heavy],
        ["horizontal_pull", 0, beginnerMain, heavy],
        ["vertical_push", 0, beginnerMain, moderate],
        ["vertical_pull", 0, beginnerMain, moderate],
        ["biceps", 0, null, light],
        ["triceps", 0, null, light],
      ]),
      day("lower-a", "Lower A", [
        ["squat", 0, beginnerMain, heavy],
        ["hinge", 0, beginnerMain, heavy],
        ["single_leg", 0, beginnerLight, moderate],
        ["core", 0, beginnerLight, light],
        ["calves", 0, null, light],
        ["core", 1, null, light],
      ]),
      day("upper-b", "Upper B", [
        ["horizontal_push", 1, beginnerMain, moderate],
        ["horizontal_pull", 1, beginnerMain, moderate],
        ["vertical_push", 1, beginnerLight, moderate],
        ["vertical_pull", 1, beginnerLight, moderate],
        ["side_delt", 0, null, light],
        ["biceps", 1, null, light],
        ["triceps", 1, null, light],
      ]),
      day("lower-b", "Lower B", [
        ["squat", 1, beginnerMain, moderate],
        ["hinge", 1, beginnerMain, moderate],
        ["single_leg", 1, beginnerLight, moderate],
        ["core", 2, beginnerLight, light],
        ["calves", 1, null, light],
        ["core", 3, null, light],
      ]),
    ],
  },
  {
    key: "ppl-upper-lower",
    trainingDays: 5,
    days: [
      day("push", "Push", [
        ["horizontal_push", 0, beginnerMain, heavy],
        ["vertical_push", 0, beginnerMain, heavy],
        ["horizontal_push", 1, beginnerLight, moderate],
        ["side_delt", 0, null, light],
        ["triceps", 0, beginnerLight, light],
      ]),
      day("pull", "Pull", [
        ["vertical_pull", 0, beginnerMain, heavy],
        ["horizontal_pull", 0, beginnerMain, heavy],
        ["horizontal_pull", 1, beginnerLight, moderate],
        ["biceps", 0, beginnerLight, light],
        ["core", 0, beginnerLight, light],
      ]),
      day("legs", "Legs", [
        ["squat", 0, beginnerMain, heavy],
        ["hinge", 0, beginnerMain, heavy],
        ["single_leg", 0, beginnerLight, moderate],
        ["calves", 0, null, light],
        ["core", 1, beginnerLight, light],
      ]),
      day("upper", "Upper", [
        ["horizontal_push", 2, beginnerMain, moderate],
        ["horizontal_pull", 2, beginnerMain, moderate],
        ["vertical_push", 1, beginnerLight, moderate],
        ["vertical_pull", 1, beginnerLight, moderate],
        ["side_delt", 1, null, light],
        ["biceps", 1, null, light],
        ["triceps", 1, null, light],
      ]),
      day("lower", "Lower", [
        ["squat", 1, beginnerMain, moderate],
        ["hinge", 1, beginnerMain, moderate],
        ["single_leg", 1, beginnerLight, moderate],
        ["calves", 1, null, light],
        ["core", 2, beginnerLight, light],
        ["core", 3, null, light],
      ]),
    ],
  },
  {
    key: "ppl-twice",
    trainingDays: 6,
    days: [
      day("push-a", "Push A", [
        ["horizontal_push", 0, beginnerMain, heavy],
        ["vertical_push", 0, beginnerMain, heavy],
        ["horizontal_push", 1, beginnerLight, moderate],
        ["side_delt", 0, null, light],
        ["triceps", 0, beginnerLight, light],
      ]),
      day("pull-a", "Pull A", [
        ["vertical_pull", 0, beginnerMain, heavy],
        ["horizontal_pull", 0, beginnerMain, heavy],
        ["horizontal_pull", 1, beginnerLight, moderate],
        ["biceps", 0, null, light],
        ["core", 0, beginnerLight, light],
      ]),
      day("legs-a", "Legs A", [
        ["squat", 0, beginnerMain, heavy],
        ["hinge", 0, beginnerMain, heavy],
        ["single_leg", 0, beginnerLight, moderate],
        ["calves", 0, null, light],
        ["core", 1, beginnerLight, light],
      ]),
      day("push-b", "Push B", [
        ["vertical_push", 1, beginnerMain, moderate],
        ["horizontal_push", 2, beginnerMain, moderate],
        ["horizontal_push", 3, beginnerLight, light],
        ["side_delt", 1, null, light],
        ["triceps", 1, beginnerLight, light],
      ]),
      day("pull-b", "Pull B", [
        ["vertical_pull", 1, beginnerMain, moderate],
        ["horizontal_pull", 2, beginnerMain, moderate],
        ["vertical_pull", 2, beginnerLight, light],
        ["biceps", 1, null, light],
        ["core", 2, beginnerLight, light],
      ]),
      day("legs-b", "Legs B", [
        ["squat", 1, beginnerMain, moderate],
        ["hinge", 1, beginnerMain, moderate],
        ["single_leg", 1, beginnerLight, moderate],
        ["calves", 1, null, light],
        ["core", 3, beginnerLight, light],
      ]),
    ],
  },
];
