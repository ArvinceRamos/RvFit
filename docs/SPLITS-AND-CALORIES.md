# Splits, incline press, rest-day calories, and review fixes

Agreed with the user on 2026-11-04 in chat. The user asked for:
- incline barbell, dumbbell, and machine chest presses;
- research on the best splits for 2–6 training days;
- lower calories on rest days in the meal plan ("when user chooses 5 days there should be 2 days that lower calories");
- a full app review, then fixing what it found without asking ("dont ask me just use the recommendation").

The user approved the plan and asked to finish everything (autopilot). Local only: no deploy or push.

Every number here is a **placeholder** pending qualified review. Each one lives in `calculationConfig` and has a row in `docs/REVIEW-SHEET.md` section 7.

## Research summary

Sources (gathered by a research subagent on 2026-11-04):
- Schoenfeld 2016 frequency meta-analysis: [PubMed 27102172](https://pubmed.ncbi.nlm.nih.gov/27102172/)
- Schoenfeld, Grgic and Krieger 2019: when weekly sets match, frequency matters little.
- ACSM 2009 progression position stand for novices (2–3 days a week, 8–12 reps): [PubMed 19204579](https://pubmed.ncbi.nlm.nih.gov/19204579/)
- Incline press and upper chest:
  - Chaves 2020: [PubMed 36334406](https://pubmed.ncbi.nlm.nih.gov/36334406/)
  - Stronger By Science on incline vs flat: <https://www.strongerbyscience.com/?p=57858>
- Carb cycling has no proven edge when the weekly total is equal; the weekly total is what matters. MacroFactor: <https://help.macrofactorapp.com/en/articles/30-does-macrofactor-support-refeeds-diet-breaks-or-carb-cycling>
- Protein around 1.6 g/kg: Morton 2018, [PubMed 28698222](https://pubmed.ncbi.nlm.nih.gov/28698222/)

What we take from it:
- Train each muscle at least twice a week.
- Beginners need about 10 hard sets per muscle per week.
- Use incline and flat presses about 1:1. Every week should have at least one of each.
- For bodyweight users, the feet-up (decline) push-up is the upper-chest exercise. The hands-up (incline) push-up is the easier version.

## Weekly schedule (Mon–Sun)

Training days come first. A dash (–) is a rest day.

| Days | Split | Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|---|---|
| 2 | Full body A/B | A | – | – | B | – | – | – |
| 3 | Full body A/B/C | A | – | B | – | C | – | – |
| 4 | Upper/Lower ×2 | Upper A | Lower A | – | Upper B | Lower B | – | – |
| 5 | Upper, Lower, Push, Pull, Legs | Upper | Lower | – | Push | Pull | Legs | – |
| 6 | Push/Pull/Legs ×2 | Push A | Pull A | Legs A | Push B | Pull B | Legs B | – |

How the app uses the schedule:
- It is a **suggestion**. Users can train on any day, and "Next up" still offers the next day they haven't logged.
- The Week and Workouts pages show it.
- The meal planner uses it to tell training days from rest days.
- The weekday layout is `calculationConfig.schedule.training_weekdays`.

## Incline press

- New movement pattern `incline_push`. Swaps stay within the pattern.
- Gym exercises, in pick order:
  - Incline dumbbell press
  - Incline machine press
  - Incline barbell press
  - Incline Smith machine press
  - Low-to-high cable fly
- Dumbbells only: there is no bench in this tier (`exercises.ts` header), so it uses the bodyweight options. These are dumbbell-tier picks.
- Bodyweight exercises:
  - Decline push-up (feet up). This is the existing `decline-push-up` key, moved into the new pattern. Keys never change.
  - Low decline push-up (feet on a step), the easier version.
- The label for `incline-push-up` becomes "Incline push-up (hands up, easier)".
- Where incline slots go in each split:

| Split | Day | Change |
|---|---|---|
| 2 days | Full body B | Second press becomes incline |
| 3 days | Full body C | Second press becomes incline |
| 4 days | Upper B | Second press becomes incline |
| 5 days | Push | Second press becomes incline; the days are reordered to Upper, Lower, Push, Pull, Legs |
| 6 days | Push A | Flat press, then incline press |
| 6 days | Push B | Starts with an incline press |

- A saved swap whose slot no longer exists is ignored, and the default exercise shows.

## Rest-day calories (meal planner)

- The saved target row never changes. The app never changes targets automatically (PLAN.md:361).
- The planner spreads that target over the week:

| Day type | Daily calories |
|---|---|
| Rest | target × (1 − `rest_day_cut_fraction`) |
| Training | (7 × target − rest days × rest-day kcal) ÷ training days |

- Training days are capped at target × (1 + `max_training_day_raise_fraction`). If the cap is hit, rest days take a smaller cut, so the weekly total still equals 7 × target.
- No day goes below the lowest calorie floor (`formula_branch_floors_kcal`, 1,200). If a rest day would, the cycle shrinks until it fits. When the target is at the floor, every day equals the target.
- Protein, fat, and fiber stay the same every day. Only carbohydrate grams change, by the calorie difference ÷ 4.
- Placeholders: `rest_day_cut_fraction` 0.10 and `max_training_day_raise_fraction` 0.15.
- Results at those values:

| Days | Training day | Rest day |
|---|---|---|
| 2 | +15% | −6% |
| 3 | +13.3% | −10% |
| 4 | +7.5% | −10% |
| 5 | +4% | −10% |
| 6 | +1.7% | −10% |

- Rounding: day kcal are whole numbers. The last training day absorbs any rounding, so the week adds up exactly.
- Where users see it:
  - The meal plan labels each day "Training day" or "Rest day" with its kcal, and shows one line: "Rest days get a little less, training days a little more. Your weekly total stays the same."
  - Today (Dashboard) and the Meals summary show today's day target.
- This is not burned-calorie feedback. `docs/ACTIVITY.md` still holds: logged activity never changes the planner.

## Review findings and fixes

The full app review ran on 2026-11-04.

| # | Problem | Fix (job) |
|---|---|---|
| H1 | The check-in could suggest eating less for a Lose user whose BMI is under 18.5 | New `underweight` status; both accept paths check again (RV-5) |
| H2 | An imperial guest with blank inches could not save after sign-up | Blank inches count as 0 (RV-5) |
| H3 | The guest draft kept the original Lose goal after the underweight guard changed it | Store the corrected goal (RV-5) |
| H4 | The calorie floor and protein cap were only checked in TypeScript, and mobile saves straight from the phone | Database checks (`NOT VALID`, new rows only) (RV-5) |
| M5 | Dumbbells-only plans include pull-up bar moves with no hint | Show the bar hint for that tier too (RV-6) |
| M6 | No incline press | Section above (RV-2) |
| M7 | Dumbbell weight was ambiguous and the steps were impractical | "Weight per dumbbell" label; dumbbell steps of 2 kg or 5 lb (RV-6) |
| L | Future workout dates were accepted | Refused past tomorrow (time-zone slack) in the app and the database (RV-6) |
| L | RPC errors not logged; a failed "I ate this" tick reported the whole save as failed; the weekly average counted half of today; start-page links usable before the 18+ tick; mobile silently used a fake Supabase URL | RV-7 |
| 4.5 | 5–6 days for beginners | Keep allowing it (the code and database already do). Preferences already warns: "Risk: a beginner on 5–6 days a week has little recovery time." |

**Not in this run:**
- Moving the copied mobile service code into shared files (a large refactor).
- Backdated weigh-ins (a new feature).

## Acceptance checks

- Every split includes an incline press each week, in every equipment tier.
- 5 days gives Mon Upper, Tue Lower, Wed rest, Thu Push, Fri Pull, Sat Legs, Sun rest.
- The meal plan for 5 days shows 2 rest days with lower kcal, and the 7 days add up to 7 × target.
- Protein and fat grams are the same on training and rest days.
- No day is below 1,200 kcal.
- The check-in never suggests a lower target when BMI is under 18.5 and the goal is lose.
- A guest with 6 ft and blank inches can save after sign-up.

## Decisions (autopilot, 2026-11-04)

- **RV-2 slot keys.** An incline slot replaces a flat press slot, so a few slot keys change (for example `b-horizontal-push-1` becomes `b-incline-push-1`). A saved swap on an old key is ignored (tested). An old log still shows its exercises in history, but editing it only offers the current slots. This is acceptable because the app is in a private test with few users.
- **RV-2 sample.** The current plans are in `docs/workout-sample-2026-11-04.md`, generated from the code. `docs/phase3-workout-sample.md` stays as the earlier review record, with a pointer at the top.
- **RV-2 dumbbell tier.** There are no dumbbell-tier incline exercises, because that tier has no bench. It uses the decline push-ups.
- **RV-3 Week page wording.** "It does not schedule anything" became "Workout days follow a suggested week; you can train on any day that suits you." "Next up" is unchanged: it still offers the first plan day not logged this week.
- **RV-4 where the day target shows.** It shows in the meal plan, Today, Food (Meals), the Week cards, and the meal builder's suggestions for the chosen date. The weekly review keeps comparing the average against the saved target, because the week's average equals it. The new config sits at the end of `calculationConfig`, so the review-sheet line numbers stay correct.
- **RV-5 guest goal.** The fix is on the server (`save-guest-draft.ts`): a saved "lose" under the BMI guard falls back to Maintain, the same rule the calculator shows. This covers web and mobile drafts, including drafts already in a browser. The client draft keeps the user's own choice, so the form still restores it.
- **RV-5 database checks.** The 1,200 kcal floor and the 35% protein cap are `NOT VALID` checks, so old rows are untouched. Future workout dates are refused by a trigger (`private.reject_future_workout_date`), because a check constraint cannot use `current_date`.
- **RV-6 beginner 5–6 days.** Preferences already shows "Risk: a beginner on 5–6 days a week has little recovery time.", so no new tip was added.
- **RV-6 dumbbells.** The weight label says "per dumbbell" for loaded exercises whose key has "dumbbell" in it, plus the goblet squat. Prompts step up by 2 kg (rounded to 1 kg) or 5 lb.
- **RV-7 weekly average.** It now uses finished days only (today is left out), and the note reads "On logged days before today".
- **RV-7 mobile env.** Nothing to change: `mobile/src/app/_layout.tsx` already shows a clear error screen through `missingEnv()`, and the fallback values only stop a crash at import.
