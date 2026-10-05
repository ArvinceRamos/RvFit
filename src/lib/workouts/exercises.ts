import type { Equipment } from "@/lib/preferences";
import type { Exercise, Measure, MovementPattern } from "./types";

/**
 * PLACEHOLDER CONTENT pending qualified review. Do not present as reviewed.
 *
 * Order matters. For each pattern and equipment tier, the list is: highest equipment tier first,
 * then the order in this file. A slot's `pick` is an index into that list.
 * Keys are permanent. To stop offering an exercise, set `retired: true`; never rename or reuse a key.
 *
 * Equipment assumptions (strict minimum):
 *   bodyweight = floor, wall, sturdy chair or table, and a pull-up bar (also used for inverted rows and hanging work)
 *   dumbbell_only = dumbbells and floor (no bench)
 *   gym = full gym
 */
function make(
  pattern: MovementPattern,
  equipment: Equipment,
  key: string,
  name: string,
  options: { measure?: Measure; loaded?: boolean; cue?: string } = {},
): Exercise {
  const { measure = "reps", loaded = equipment !== "bodyweight", cue } = options;
  return { key, name, pattern, equipment, measure, loaded, ...(cue ? { cue } : {}) };
}

const bw = "bodyweight";
const db = "dumbbell_only";
const gym = "gym";

export const exercises: readonly Exercise[] = [
  // squat
  make("squat", gym, "leg-press", "Leg press", { cue: "Press through your whole foot." }),
  make("squat", gym, "barbell-back-squat", "Barbell back squat", { cue: "Keep your chest up and your knees over your toes." }),
  make("squat", db, "goblet-squat", "Goblet squat", { cue: "Hold one dumbbell at your chest and sit between your hips." }),
  make("squat", db, "dumbbell-front-squat", "Dumbbell front squat", { cue: "Rest the dumbbells on your shoulders." }),
  make("squat", bw, "bodyweight-squat", "Bodyweight squat", { cue: "Sit back and down, then stand tall." }),
  make("squat", bw, "chair-box-squat", "Chair box squat", { cue: "Sit lightly on a sturdy chair, then stand." }),
  make("squat", bw, "pause-squat", "Pause squat", { cue: "Hold the bottom for one second." }),

  // hinge
  make("hinge", gym, "barbell-romanian-deadlift", "Barbell Romanian deadlift", { cue: "Push your hips back and keep the bar close." }),
  make("hinge", gym, "seated-leg-curl", "Seated leg curl", { cue: "Curl slowly and control the return." }),
  make("hinge", db, "dumbbell-romanian-deadlift", "Dumbbell Romanian deadlift", { cue: "Push your hips back with a flat back." }),
  make("hinge", db, "dumbbell-glute-bridge", "Dumbbell glute bridge", { cue: "Rest a dumbbell on your hips and squeeze at the top." }),
  make("hinge", bw, "glute-bridge", "Glute bridge", { cue: "Drive your heels down and squeeze your glutes." }),
  make("hinge", bw, "single-leg-glute-bridge", "Single-leg glute bridge", { cue: "Keep your hips level." }),
  make("hinge", bw, "bodyweight-good-morning", "Bodyweight good morning", { cue: "Hinge at the hips with a soft knee bend." }),
  make("hinge", bw, "single-leg-romanian-deadlift", "Single-leg Romanian deadlift", { cue: "Hinge on one leg and reach long. Touch a wall for balance if needed." }),

  // single_leg
  make("single_leg", gym, "smith-machine-split-squat", "Smith machine split squat", { cue: "Keep your front foot flat." }),
  make("single_leg", gym, "bulgarian-split-squat", "Bulgarian split squat", { cue: "Rest your back foot on a bench." }),
  make("single_leg", db, "dumbbell-reverse-lunge", "Dumbbell reverse lunge", { cue: "Step back and lower straight down." }),
  make("single_leg", db, "dumbbell-step-up", "Dumbbell step-up", { cue: "Step onto a sturdy chair and stand fully." }),
  make("single_leg", db, "dumbbell-split-squat", "Dumbbell split squat", { cue: "Stay tall and lower straight down." }),
  make("single_leg", bw, "reverse-lunge", "Reverse lunge", { cue: "Step back and lower straight down." }),
  make("single_leg", bw, "split-squat", "Split squat", { cue: "Keep your front foot flat." }),
  make("single_leg", bw, "chair-step-up", "Chair step-up", { cue: "Use a sturdy chair and push through the front foot." }),
  make("single_leg", bw, "chair-bulgarian-split-squat", "Chair Bulgarian split squat", { cue: "Rest your back foot on a sturdy chair." }),
  make("single_leg", bw, "single-leg-chair-squat", "Single-leg chair squat", { cue: "Lower to a sturdy chair on one leg and stand." }),

  // horizontal_push
  make("horizontal_push", gym, "dumbbell-bench-press", "Dumbbell bench press", { cue: "Lower with control to chest level." }),
  make("horizontal_push", gym, "machine-chest-press", "Machine chest press", { cue: "Press forward without shrugging." }),
  make("horizontal_push", gym, "barbell-bench-press", "Barbell bench press", { cue: "Keep your feet planted and shoulder blades back." }),
  make("horizontal_push", gym, "cable-chest-fly", "Cable chest fly", { cue: "Keep a soft bend in your elbows." }),
  make("horizontal_push", db, "dumbbell-floor-press", "Dumbbell floor press", { cue: "Lower until your upper arms touch the floor." }),
  make("horizontal_push", db, "dumbbell-floor-fly", "Dumbbell floor fly", { cue: "Open your arms wide with a soft elbow bend." }),
  make("horizontal_push", db, "dumbbell-squeeze-press", "Dumbbell squeeze press", { cue: "Lie on the floor and press the dumbbells together as you push up." }),
  make("horizontal_push", db, "dumbbell-grip-push-up", "Dumbbell-grip push-up", { loaded: false, cue: "Hands on dumbbells for a deeper range. Keep them from rolling." }),
  make("horizontal_push", bw, "push-up", "Push-up", { cue: "Keep your body in a straight line." }),
  make("horizontal_push", bw, "incline-push-up", "Incline push-up", { cue: "Hands on a sturdy table or chair." }),
  make("horizontal_push", bw, "decline-push-up", "Decline push-up", { cue: "Feet on a sturdy chair." }),
  make("horizontal_push", bw, "knee-push-up", "Knee push-up", { cue: "Keep a straight line from knees to head." }),

  // vertical_push
  make("vertical_push", gym, "machine-shoulder-press", "Machine shoulder press", { cue: "Press up without arching your back." }),
  make("vertical_push", gym, "barbell-overhead-press", "Barbell overhead press", { cue: "Brace your stomach and press straight up." }),
  make("vertical_push", db, "dumbbell-shoulder-press", "Dumbbell shoulder press", { cue: "Press up and slightly together." }),
  make("vertical_push", db, "dumbbell-arnold-press", "Dumbbell Arnold press", { cue: "Rotate your palms as you press." }),
  make("vertical_push", bw, "pike-push-up", "Pike push-up", { cue: "Hips high, lower the top of your head toward the floor." }),
  make("vertical_push", bw, "feet-elevated-pike-push-up", "Feet-elevated pike push-up", { cue: "Put your feet on a sturdy chair." }),
  make("vertical_push", bw, "pike-hold", "Pike hold", { measure: "seconds", cue: "Hold the top of the pike with hips high." }),

  // horizontal_pull
  make("horizontal_pull", gym, "seated-cable-row", "Seated cable row", { cue: "Pull your elbows back and squeeze your shoulder blades." }),
  make("horizontal_pull", gym, "chest-supported-machine-row", "Chest-supported machine row", { cue: "Keep your chest on the pad." }),
  make("horizontal_pull", gym, "barbell-bent-over-row", "Barbell bent-over row", { cue: "Keep a flat back and pull to your stomach." }),
  make("horizontal_pull", db, "one-arm-dumbbell-row", "One-arm dumbbell row", { cue: "Rest a hand on a sturdy chair and pull to your hip." }),
  make("horizontal_pull", db, "dumbbell-bent-over-row", "Dumbbell bent-over row", { cue: "Keep a flat back and pull to your stomach." }),
  make("horizontal_pull", bw, "inverted-row", "Inverted row", { cue: "Under a low bar or sturdy table. Keep your body straight." }),
  make("horizontal_pull", bw, "feet-elevated-inverted-row", "Feet-elevated inverted row", { cue: "Put your feet on a sturdy chair." }),
  make("horizontal_pull", bw, "wide-grip-inverted-row", "Wide-grip inverted row", { cue: "Use an overhand grip wider than your shoulders." }),

  // vertical_pull
  make("vertical_pull", gym, "lat-pulldown", "Lat pulldown", { cue: "Pull the bar to your upper chest." }),
  make("vertical_pull", gym, "assisted-pull-up-machine", "Assisted pull-up machine", { cue: "Pull your chest toward the bar." }),
  make("vertical_pull", gym, "straight-arm-pulldown", "Straight-arm pulldown", { cue: "Keep your arms long and sweep down." }),
  make("vertical_pull", db, "dumbbell-floor-pullover", "Dumbbell floor pullover", { cue: "Lie on the floor and sweep the dumbbell overhead." }),
  make("vertical_pull", bw, "negative-pull-up", "Negative pull-up", { cue: "Jump or step up, then lower slowly for about 3 seconds." }),
  make("vertical_pull", bw, "pull-up", "Pull-up", { cue: "Overhand grip. Pull your chest toward the bar." }),
  make("vertical_pull", bw, "chin-up", "Chin-up", { cue: "Underhand grip. Pull your chin over the bar." }),
  make("vertical_pull", bw, "scapular-pull-up", "Scapular pull-up", { cue: "Hang with straight arms and pull your shoulder blades down." }),
  make("vertical_pull", bw, "dead-hang", "Dead hang", { measure: "seconds", cue: "Hang from the bar with straight arms." }),

  // side_delt
  make("side_delt", gym, "cable-lateral-raise", "Cable lateral raise", { cue: "Lift out to the side to shoulder height." }),
  make("side_delt", db, "dumbbell-lateral-raise", "Dumbbell lateral raise", { cue: "Lift out to the side to shoulder height." }),
  make("side_delt", db, "dumbbell-leaning-lateral-raise", "Dumbbell leaning lateral raise", { cue: "Lean slightly away from the dumbbell." }),
  make("side_delt", bw, "wall-lateral-press-hold", "Wall lateral press hold", { measure: "seconds", cue: "Press the backs of your hands into a wall." }),
  make("side_delt", bw, "side-lying-lateral-raise", "Side-lying lateral raise", { cue: "Lie on your side and lift your top arm." }),

  // biceps
  make("biceps", gym, "cable-biceps-curl", "Cable biceps curl", { cue: "Keep your elbows by your sides." }),
  make("biceps", gym, "barbell-curl", "Barbell curl", { cue: "Curl without swinging your body." }),
  make("biceps", db, "dumbbell-biceps-curl", "Dumbbell biceps curl", { cue: "Keep your elbows by your sides." }),
  make("biceps", db, "dumbbell-hammer-curl", "Dumbbell hammer curl", { cue: "Palms face each other." }),
  make("biceps", bw, "underhand-inverted-row", "Underhand inverted row", { cue: "Under a low bar or sturdy table with an underhand grip." }),
  make("biceps", bw, "close-grip-chin-up", "Close-grip chin-up", { cue: "Underhand grip with your hands close together." }),

  // triceps
  make("triceps", gym, "cable-triceps-pushdown", "Cable triceps pushdown", { cue: "Keep your elbows by your sides." }),
  make("triceps", db, "dumbbell-overhead-triceps-extension", "Dumbbell overhead triceps extension", { cue: "Keep your elbows pointing forward." }),
  make("triceps", db, "dumbbell-triceps-kickback", "Dumbbell triceps kickback", { cue: "Straighten your arm behind you." }),
  make("triceps", bw, "chair-dip", "Chair dip", { cue: "Use a sturdy chair and keep your back close to it." }),
  make("triceps", bw, "close-grip-push-up", "Close-grip push-up", { cue: "Hands under your shoulders, elbows close." }),
  make("triceps", bw, "bodyweight-triceps-extension", "Bodyweight triceps extension", { cue: "Hands on a bar or sturdy table. Bend your elbows to lower, then straighten." }),

  // core
  make("core", gym, "cable-crunch", "Cable crunch", { cue: "Curl your ribs toward your hips." }),
  make("core", gym, "cable-pallof-press", "Cable Pallof press", { cue: "Resist twisting as you press out." }),
  make("core", db, "dumbbell-farmer-carry", "Dumbbell farmer carry", { measure: "seconds", cue: "Walk tall with a dumbbell in each hand." }),
  make("core", db, "dumbbell-russian-twist", "Dumbbell Russian twist", { cue: "Rotate from your ribs, not your arms." }),
  make("core", bw, "plank", "Plank", { measure: "seconds", cue: "Keep your body in a straight line." }),
  make("core", bw, "dead-bug", "Dead bug", { cue: "Keep your lower back on the floor." }),
  make("core", bw, "side-plank", "Side plank", { measure: "seconds", cue: "Stack your feet and lift your hips." }),
  make("core", bw, "bird-dog", "Bird dog", { cue: "Reach long and keep your hips level." }),
  make("core", bw, "lying-leg-raise", "Lying leg raise", { cue: "Lower slowly without arching your back." }),
  make("core", bw, "hanging-knee-raise", "Hanging knee raise", { cue: "Hang from the bar and lift your knees without swinging." }),
  make("core", bw, "crunch", "Crunch", { cue: "Curl your ribs toward your hips." }),

  // calves
  make("calves", gym, "standing-calf-raise-machine", "Standing calf raise machine", { cue: "Pause at the top." }),
  make("calves", gym, "seated-calf-raise-machine", "Seated calf raise machine", { cue: "Pause at the top." }),
  make("calves", db, "dumbbell-calf-raise", "Dumbbell calf raise", { cue: "Pause at the top." }),
  make("calves", bw, "calf-raise", "Calf raise", { cue: "Rise onto your toes and pause." }),
  make("calves", bw, "single-leg-calf-raise", "Single-leg calf raise", { cue: "Hold a wall for balance." }),
];

const equipmentRank: Record<Equipment, number> = { bodyweight: 0, dumbbell_only: 1, gym: 2 };

export function equipmentAllows(tier: Equipment, required: Equipment): boolean {
  return equipmentRank[required] <= equipmentRank[tier];
}

const byKey = new Map(exercises.map((exercise) => [exercise.key, exercise]));

/** Includes retired exercises, so old logs still display. */
export function getExercise(key: string): Exercise | undefined {
  return byKey.get(key);
}

/** Ordered, non-retired exercises of one pattern that the tier can do: highest equipment first, then file order. */
export function patternList(pattern: MovementPattern, tier: Equipment): Exercise[] {
  return exercises
    .filter((exercise) => exercise.pattern === pattern && !exercise.retired && equipmentAllows(tier, exercise.equipment))
    .map((exercise, index) => ({ exercise, index }))
    .sort((a, b) => equipmentRank[b.exercise.equipment] - equipmentRank[a.exercise.equipment] || a.index - b.index)
    .map(({ exercise }) => exercise);
}
