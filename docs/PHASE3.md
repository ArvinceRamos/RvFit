# Phase 3 — Workouts

## Readiness and review gates

- This document is the Phase 3 behavior and data outline. Phase 3 remains local-only; do not deploy.
- Phase 3 is workouts only. Dashboard, weekly plan view, progress views, weight trend, and Profile and targets stay in Phase 4. See `docs/PLAN.md`.
- Workout content (exercises, sets, reps, rest, swaps, progression numbers) is a placeholder until qualified review before public launch. Do not present it as reviewed.
- Before any workout screen is built (job P3-2), present a sample plan for each of the five splits and a coverage report. Wait for the user to review and approve the content. This is the same review gate used for the USDA food mapping.
- Phase 3 reads the user's saved Preferences from Phase 2. It does not change the preferences screen.

## Screen flow

1. A signed-in user opens **Workouts** from the navigation bar.
2. If Preferences are not saved, the page says so and links to Preferences. The app never guesses level, equipment, or days.
3. Otherwise the page shows one plan, chosen automatically from the saved experience, equipment, and training days. It shows a summary line (for example "Beginner · 3 days a week · Dumbbells only") and a link to change Preferences.
4. The plan lists every day with its exercises, sets and reps (or seconds), and rest. Each exercise has **Swap**, and **Reset to default** when it is swapped.
5. The user picks a day and chooses **Log this workout**. There is no scheduling and no "up next" marker.
6. The log screen shows each planned exercise with a "Last time" line and, when earned, an optional progression prompt. The user enters reps (or seconds) and weight per set, picks a date, and saves.
7. **Recent workouts** lists the latest 10. The user can open one and edit it.

There is no workout confirmation checkbox, no rest timer, no notes field, and no delete. Weekly plan and progress charts are Phase 4.

## Content lives in code, not in the database

Keep templates and exercises in project TypeScript files under `src/lib/workouts/`. Do not create `exercises` or `workout_templates` tables. Workout records store template, day, slot, and exercise IDs as text keys, and the app checks keys against the content files.

- **Exercise:** `key`, `name`, `pattern`, `equipment` (the lowest tier that can do it), `measure` (`reps` or `seconds`), `loaded` (uses added weight), optional one-line `cue`, optional `retired`.
- **Movement patterns:** squat, hinge, single_leg, horizontal_push, vertical_push, horizontal_pull, vertical_pull, side_delt, biceps, triceps, core, calves.
- **Split:** a shared structure with days, and each day has slots. A slot has a `key`, a `pattern`, a `pick` (which exercise from that pattern's ordered list for the tier), and optional `beginner` and `intermediate` schemes: `{ sets, reps: { min, max }, restSeconds }`. For a `seconds` exercise the range is seconds. A slot with no beginner scheme is left out for beginners.
- **Template:** a split resolved for one level and one equipment tier. The resolver returns null for an invalid combination.

### Splits (shared by every level and equipment option)

| Days | Split key | Day keys |
| --- | --- | --- |
| 2 | `full-body-ab` | `a`, `b` |
| 3 | `full-body-abc` | `a`, `b`, `c` |
| 4 | `upper-lower` | `upper-a`, `lower-a`, `upper-b`, `lower-b` |
| 5 | `ppl-upper-lower` | `push`, `pull`, `legs`, `upper`, `lower` |
| 6 | `ppl-twice` | `push-a`, `pull-a`, `legs-a`, `push-b`, `pull-b`, `legs-b` |

Beginner and intermediate both support 2–6 days (changed from the original plan, which limited 5–6 days to intermediate). This matches the database constraint on `user_preferences`, updated by the migration `20261006070000_phase3_beginner_training_days.sql`. That gives 15 beginner templates and 15 intermediate templates, 30 in total. Beginner 5–6 day days have 4–5 exercises, like other beginner days.

### Template keys

`<split key>.<level>.<equipment>`, for example `full-body-abc.beginner.dumbbell_only`. Day, slot, and exercise keys are lowercase letters, digits, and hyphens.

**Keys are permanent.** Never rename or reuse a template, day, slot, or exercise key. To stop offering an exercise, set `retired: true`. Retired exercises still display in old logs but are not offered as swaps or defaults.

## Level and equipment rules

- **Beginner:** fewer exercises per day (about 4–5), 2–3 sets, 8–12 reps, simple movements.
- **Intermediate:** more exercises per day (about 5–7), 3–4 sets, a mix of rep ranges.
- **Equipment tiers include the tiers below them.** Gym users can use dumbbell and bodyweight exercises. Dumbbell-only users can use bodyweight exercises.
- **Equipment assumptions (strict minimum):**
  - Bodyweight: floor, wall, sturdy chair or table, and a pull-up bar (also used for inverted rows and hanging work). No parallel bars or rings.
  - Dumbbell-only: dumbbells on top of the bodyweight kit. No bench.
  - Gym: full gym equipment.
- Rest time is shown as text only.

## Swaps

- A swap replaces the exercise in one slot of one template. It is saved for that user, template, and slot until the user resets it. It applies to every future session.
- Swap options for a slot are exercises with the same pattern, allowed by the user's equipment tier, not retired, and not already used elsewhere on the same day.
- Every slot should have at least one swap option wherever the tier allows it.
- A saved swap that is no longer a valid option is ignored and the default is used.
- If the user changes Preferences, the template key changes and the old swaps stay unused. Nothing is deleted.
- **Reset to default** removes the saved swap.

## Logging a workout

- A log has a date (defaults to today, must be a real calendar date), the template key, the day key, and sets.
- Each set records the slot, the exercise actually done, the set number, reps or seconds (depending on the exercise measure), and weight for loaded exercises. Bodyweight exercises have no weight.
- The exercise on a set must be a valid option for that slot (the default, a swap, or another valid option).
- At least one set is required. The user may log only some of the planned exercises.
- Saving uses one database function that creates or replaces the whole workout in a single transaction, as `save_meal` does for meals.
- The user's units come from the saved profile (`preferred_units`, metric if none). Weights are entered in those units and stored in kilograms, using the same pound-to-kilogram value as weigh-ins. Display rounds to one decimal.

## Optional progression prompts

- A prompt is a suggestion only. It never changes a plan, a weight, or a log. Ignoring it has no effect. It has no checkbox and no dismiss state.
- It uses the most recent earlier log that contains the same exercise.
- A prompt shows only when that log has at least the planned number of sets and every planned set reached the top of the rep range (or the top seconds for a hold).
- What it suggests:
  - Loaded exercise: add a small weight to the heaviest weight used. Lower-body patterns (squat, hinge, single_leg) use the larger step.
  - Bodyweight reps: aim for a few more reps per set.
  - Hold: add a few seconds.
- Suggested weights are rounded to a practical step (0.5 kg or 1 lb) in the user's units.
- Prompts show on the new-workout screen only, using logs from before the chosen date. They do not show on the edit screen.

## Database outline

One migration, applied locally with `npx supabase migration up`. Never run `supabase db reset`, because it deletes local accounts.

- `workout_logs`: `id`, `user_id`, `template_key`, `day_key`, `performed_on`, `created_at`, `updated_at`.
- `workout_log_sets`: `id`, `workout_log_id`, `slot_key`, `exercise_key`, `set_number`, `reps` or `seconds` (exactly one), `weight_kg` (optional). Limits are checked in the database and mirror the app limits.
- `user_exercise_swaps`: `user_id`, `template_key`, `slot_key`, `exercise_key`, `updated_at`. One swap per user, template, and slot.
- Row-level security on all three tables. Sets are reachable only through a log the user owns.
- `save_workout_log`: creates or replaces a workout and its sets atomically, runs as the caller, and is executable only by signed-in users.

## Placeholder values

These start as placeholders in `src/lib/calc/config.ts` and stay placeholders until review.

| Value | Initial placeholder |
| --- | --- |
| Maximum sets per exercise in one log | 10 |
| Maximum reps per set | 100 |
| Maximum seconds per set | 600 |
| Maximum weight per set | 500 kg |
| Weight step, upper-body patterns | 2.5 kg |
| Weight step, lower-body patterns | 5 kg |
| Extra reps for an unloaded exercise | 2 |
| Extra seconds for a hold | 5 |
| Beginner scheme | 2–3 sets, 8–12 reps, 60–90 s rest, holds 20–40 s |
| Intermediate scheme | 3–4 sets, 6–12 reps, 60–120 s rest, holds 30–60 s |

## Out of scope

Dashboard, weekly plan view, progress charts, weight trend, profile editing, delete workout, rest timer, workout notes, warm-up sets, supersets, custom exercises, exercise images or videos, AI plans, "up next" suggestions, advanced levels, and any new health or safety wording beyond the existing footer disclaimer.

## Acceptance checks (Phase 3 done when)

A hands-on walkthrough with a test user selects a valid template for level, schedule, and equipment; swaps an exercise and sees it persist and reset; logs a workout and edits it; and sees an optional progression prompt after logging every planned set at the top of the rep range. In addition:

- All 30 valid combinations resolve, and invalid combinations do not.
- Another user cannot read or change a user's workout logs or swaps, and signed-out visitors are denied.
- `npx tsc --noEmit`, `npm run lint`, and `npm test` pass. Run `npm run build` only when the dev server is stopped.
