# Activity — steps, sleep, and calories burned

Agreed with the user on 2026-10-28 in chat. This adds a feature that is not in the V1 plan. The user asked for it ("i want to add sleep time, steps, calories burned today (should be automatic) based on every workout, steps and others") and approved this outline ("continue with the plan").

## Readiness and review gates

- Local only. Do not deploy or push without the user's OK.
- **This replaces one earlier decision.** On 2026-10-25 the user said no "Other activity" (docs/handoffs/AU-78.md). Their 2026-10-28 request ("and others") brings it back, in the small form below.
- Every number below is a **placeholder** that goes in `calculationConfig.activity` and gets a row on `docs/REVIEW-SHEET.md`. Never mark one as reviewed.
- **New wording is allowed for these lines only.** The labels "Burned today (estimate)", "Resting", "Workouts", "Steps", "Other activity", "About X kcal by end of day", and this one line: "Burned calories are rough estimates. They do not change your calorie target." Everything else in the "no new health or safety wording" rule still applies. No sleep advice, no step goals, no "aim for" lines.
- **Burned calories are for information only.** They never change the calorie target, the "left" numbers, the check-in, or the meal planner. Reason: the target already counts activity through the activity multiplier, so adding burned calories would count it twice. It also avoids "I earned food" thinking (see the eating-disorder line in the disclaimer).

## What the user sees

### Today (`/dashboard`)

1. **Burned today (estimate)** card:
   - The total so far, in kcal. The resting part goes up through the day.
   - A breakdown: Resting, Workouts, Steps, Other activity.
   - "About X kcal by end of day": the full day's resting burn plus the activity logged so far.
   - The rough-estimates line above.
   - With no saved height, age, or sex (a manual-target user), Resting shows "Add your details in Profile" with a link, and the card shows only the activity parts.
   - With no weigh-in, the activity parts show "Log a weigh-in" with a link to Progress. Every estimate needs a weight.
2. **Steps and sleep** card with two small forms:
   - **Steps today:** one whole number. Saving again replaces today's number.
   - **Sleep last night:** hours and minutes. It is saved on today's date, the day you woke up. Saving again replaces it.
3. **Other activity:** an "Add activity" form with an activity picker and minutes, plus a list of today's entries, each with Delete.

### Workouts

- The workout log form gets an optional **Duration (minutes)** field.
- If it's left empty, the estimate uses the number of logged sets × a minutes-per-set placeholder.

### Progress

- **Steps:** the average of the last 7 days that have a number, and a list of those 7 days.
- **Sleep:** the same, shown in hours and minutes.
- Like the weight trend, an average needs at least 3 days with a number. With fewer, show "Not enough data yet."

## The math (pure functions, `src/lib/activity/`)

Every formula reads its numbers from `calculationConfig.activity`. None of them is hard-coded.

- **Resting burn per day** = Mifflin–St Jeor BMR from the existing calculation module, using the profile's height, age, and sex and the latest weigh-in's weight. No activity multiplier.
- **Resting so far** = resting per day × (minutes since local midnight ÷ 1440). This is computed in the browser, so it uses the user's local time, and it updates once a minute.
- **Workout** = (MET − 1) × weight_kg × hours. MET is `strength_met` (placeholder 3.5). Hours come from the duration, or from sets × `minutes_per_set` (placeholder 3) when there is no duration. The "− 1" removes the resting part, which is already counted under Resting.
- **Steps** = steps × weight_kg × `kcal_per_step_per_kg` (placeholder 0.0004, already net of resting).
- **Other activity** = (MET − 1) × weight_kg × hours, with the MET from a small config list (placeholders):

| Key | Label | MET |
| --- | --- | --- |
| cycling | Cycling | 6.8 |
| running | Running | 8.0 |
| swimming | Swimming | 6.0 |
| sports | Team sports | 7.0 |
| dancing | Dancing | 5.0 |
| other_cardio | Other cardio | 5.0 |

There is no Walking option, because walking is counted by steps. Counting it twice would inflate the number.

- Round all displayed values to whole kcal. Negative results are not possible with valid inputs, but clamp them to 0 anyway.

## Data and database

One migration. Use the same patterns as the existing tables:
- `on delete cascade` from `auth.users`, so account deletion covers the new rows.
- Row-level security: the owner only.
- Revoked extra grants (`20261025010000`).
- The `stamp_created_at` and `enforce_row_limit` triggers (`20261025020000`), with placeholder limits.

Tables and columns:
- `daily_activity`:
  - Columns: `id`, `user_id`, `on_date` (date), `steps` (int, 0–100000, nullable), `sleep_minutes` (int, 0–1440, nullable), `created_at`, `updated_at`.
  - Unique key: (`user_id`, `on_date`). Steps and sleep save with an upsert on that key, so saving one keeps the other.
- `activity_logs`:
  - Columns: `id`, `user_id`, `performed_on` (date), `activity_key` (text, checked against a key pattern; the app checks it against the config list), `minutes` (int, 1–600), `created_at`.
- `workout_logs.duration_min`: int, 1–600, nullable. `save_workout_log` gets an optional `p_duration_min`, with a default of null, so old callers still work.

Dates use the browser's local date, sent from the client, the same way meals and workouts do.

pgTAP tests:
- Another user can't read or change these rows.
- Signed-out visitors are denied.
- The limits fire.
- Deleting a user removes the rows.
- The (user, date) upsert keeps one row per day.

## Out of scope

Wearable or phone sync (a browser can't read phone health data; this comes with the mobile app), step goals, sleep quality or stages, heart rate, water, streaks, charts beyond the lists above, and burned calories changing any target.

## Risks to keep in view

- These are rough estimates; strength workouts especially can be 30–50% off. Always label them as estimates.
- Time zones: the resting burn and "today" must use the browser's local time.
- Placeholder MET and per-step values need the qualified review before public launch.

## Acceptance checks (done when)

A hands-on walkthrough with a test user:
- Logs steps, sleep, a workout with a duration, and one other activity.
- Sees Burned today grow and match the formulas.
- Sees Progress averages appear after 3 days.
- Deleting the account removes the new rows.

Also: lint, typecheck, unit tests, database tests, e2e, build, and `npm audit --omit=dev` pass.
