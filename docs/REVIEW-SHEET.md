# RvFit qualified review sheet

For the person who reviews RvFit's health values and safety copy before any public launch (`docs/PLAN.md`, "Launch review and deployment"). Prepared 2026-10-25 (AU-70).

**Nothing on this sheet has been reviewed yet.** Every value below is a placeholder. The "Evidence notes" column comes from the 2026-10-24 product audit's reading of published sources. It is background for the reviewer, not a review.

## How to use it

- For each row, write **Approve**, or **Change to …**, with a short note.
- Sign the block at the end with your name, qualification (for example registered dietitian, physician or certified strength coach) and the date. Different people can review different sections.
- The owner then changes `src/lib/calc/config.ts` (or the copy file listed), bumps `config_version`, and marks the TASKS line done. Saved targets are history and are never rewritten: a changed value applies to new and recalculated targets only.

## 1. Calorie estimate

| # | Item | Current value | Where | Evidence notes (not a review) | Decision |
|---|---|---|---|---|---|
| 1.1 | Formula | Mifflin–St Jeor: 10 × kg + 6.25 × cm − 5 × age, +5 male, −161 female | `src/lib/calc/config.ts:22` | The most reliable of four common equations, but within ±10% for only about 75% of people with obesity (Frankenfield 2005). The check-in is meant to correct for this over time. | |
| 1.2 | Activity multipliers | Sedentary 1.2, light 1.375, moderate 1.55, very active 1.725, extra active 1.9 | `config.ts:28` | Standard values. The audit suggested adding "If unsure, pick the lower level." | |
| 1.3 | Weight-loss paces | Slow −250 kcal, Faster −500 kcal a day | `config.ts:35` | The audit suggested a percentage of body weight instead (500 kcal is about 18% of maintenance for a 130 kg man, about 28% for a 60 kg woman). | |
| 1.4 | Maximum deficit | 500 kcal a day | `config.ts:35` | As 1.3. | |
| 1.5 | Weight-gain paces | Slow +100 kcal, Faster +200 kcal a day | `config.ts:35` | Medium-low confidence for Faster. | |
| 1.6 | Calorie floors | 1,500 kcal (male formula), 1,200 kcal (female formula); a manual target uses the lowest floor | `config.ts:40` | Match the American Heart Association's lower bounds. | |
| 1.7 | Underweight guard | Below BMI 18.5, Lose weight is not offered (calculator, Profile and server). Manual targets do not ask height, so the guard does not cover them. | `config.ts:42` | 18.5 is the WHO underweight cut-off. Reviewer: is the manual-target gap acceptable? | |
| 1.8 | Database bounds | Any saved target must be 800–6,000 kcal (a last safety net under the floors) | `config.ts:43` | Technical bound, not shown to users. | |
| 1.9 | Input ranges | Age 18–100, height 120–230 cm, weight 30–300 kg | `config.ts:6` | Adults only; the age is self-reported. | |
| 1.10 | Weekly estimates shown for paces | Lose: Slow about 0.25 kg, Faster about 0.5 kg a week. Gain: Slow about 0.1 kg, Faster about 0.2 kg a week. | `src/lib/target-options.ts:27` | Derived from 7,700 kcal per kg (row 4.6). | |

## 2. Macros

| # | Item | Current value | Where | Evidence notes (not a review) | Decision |
|---|---|---|---|---|---|
| 2.1 | Protein | 1.6 g per kg of body weight | `config.ts:129` | Morton 2018: gains level off around 1.62 g/kg, but weight-loss studies were excluded. | |
| 2.2 | Protein above BMI 30 | Uses the weight at BMI 30 for the person's height instead of current weight (calculated targets only) | `config.ts:135` | No trials set protein needs for obesity. Example: 130 kg × 1.6 = 208 g vs about 142 g at the BMI-30 weight for 1.72 m (88.8 kg). | |
| 2.3 | Protein cap | At most 35% of target calories | `config.ts:129` | | |
| 2.4 | Fat minimum | At least 20% of target calories (also the default) | `config.ts:129` | The default lands exactly at 20%, which leaves a high carbohydrate share. Reviewers may prefer a 25–30% default. | |
| 2.5 | Fiber | 14 g per 1,000 kcal | `config.ts:129` | Institute of Medicine value. | |
| 2.6 | Energy per gram | Protein 4, carbohydrate 4, fat 9 kcal | `config.ts:129` | Standard Atwater values. | |
| 2.7 | Mismatch warning | Warn when edited macros differ from the target by more than 5% | `config.ts:129` | | |

## 3. Progress and the target check-in

The check-in only suggests a change; the user decides. It never changes a target by itself.

| # | Item | Current value | Where | Evidence notes (not a review) | Decision |
|---|---|---|---|---|---|
| 3.1 | Weight trend shown | 7-day average, needs at least 3 weigh-ins | `config.ts:96` | Fine for display; not used for suggestions. | |
| 3.2 | Check-in window | Straight-line trend over the last 21 days | `config.ts:85` | | |
| 3.3 | Settle period | Weigh-ins in the first 7 days after a new target are skipped (water and glycogen shifts) | `config.ts:85` | | |
| 3.4 | Data needed | At least 8 weigh-in days spanning 14 days | `config.ts:85` | | |
| 3.5 | On track | Within 0.15 kg a week of the chosen pace | `config.ts:85` | | |
| 3.6 | Clear trend | A change is only suggested when the gap is at least 2 standard errors of the trend | `config.ts:85` | | |
| 3.7 | Energy per kg | 7,700 kcal per kg of body weight | `config.ts:85` | A rough rule of thumb; real change slows over time (Thomas 2013). | |
| 3.8 | Size of a suggested change | 100–200 kcal, in steps of 50 | `config.ts:85` | | |

## 4. Training

| # | Item | Current value | Where | Evidence notes (not a review) | Decision |
|---|---|---|---|---|---|
| 4.1 | Beginner scheme | 2–3 sets of 8–12 reps, 60–90 s rest, holds 20–40 s | `config.ts:114` | Consistent with the 2026 ACSM resistance-training position stand. | |
| 4.2 | Intermediate scheme | 3–4 sets of 6–12 reps, 60–120 s rest, holds 30–60 s | `config.ts:114` | | |
| 4.3 | Progression steps | Upper body +2.5 kg, lower body +5 kg, light loads (under 20 kg) +1 kg; unloaded +2 reps; holds +5 s; past 20 reps or 60 s, suggest a harder variation | `config.ts:98` | Double progression, as the ACSM stand describes. | |
| 4.4 | Effort cue | "End each set when you could do about 1–3 more good reps. Stop if form breaks down or anything hurts." | `src/components/workout-log-form.tsx:239` | People underestimate reps left by about 1 (Halperin 2022), so this lands near 2–3 in reserve. | |
| 4.5 | Training days | 2–6 days a week for both levels | database migration `20261006070000_phase3_beginner_training_days` | `docs/PLAN.md` says 5–6 days are for intermediate users only; the database lets beginners choose them. Pick one. | |

## 5. Safety and legal copy

| # | Item | Current text | Where | Decision |
|---|---|---|---|---|
| 5.1 | Disclaimer (results and footer) | "These are estimates for healthy adults and are not medical advice. If you are pregnant, breastfeeding, or have a medical condition, talk to a doctor before changing your diet. If you have or have had an eating disorder, talk to a professional before tracking calories." | `src/lib/legal.ts:6` | |
| 5.2 | Underweight message | "Your BMI is under 18.5, so Lose weight is not offered. Talk to a doctor before trying to lose weight." | `src/lib/calc/calculate.ts:140` | |
| 5.3 | Goal descriptions | Lose, Maintain and Gain descriptions and the "How fast?" choices | `src/lib/target-options.ts` | |
| 5.4 | Privacy and Terms pages | Marked as drafts for a private family test | `src/app/privacy`, `src/app/terms` | |
| 5.5 | Contact email | The owner's personal address, which must change before a public launch | `src/lib/legal.ts:2` | |

## 6. Activity estimates (calories burned)

Added 2026-10-28 (AC-2, `docs/ACTIVITY.md`). Burned calories are shown for information only and never change a target. Each activity estimate is (MET − 1) × kg × hours; the "− 1" leaves out the resting part, which the resting row already counts. These values were not in the 2026-10-24 audit, so the notes below only say where each value comes from.

| # | Item | Current value | Where | Evidence notes (not a review) | Decision |
|---|---|---|---|---|---|
| 6.1 | Resting burn | Mifflin–St Jeor BMR (row 1.1), no activity multiplier, spread over the day by local time | `src/lib/activity/burn.ts:59` | Same formula as row 1.1. | |
| 6.2 | Strength workout MET | 3.5 | `config.ts:149` | Placeholder from `docs/ACTIVITY.md`. Strength estimates can be 30–50% off. | |
| 6.3 | Minutes per set (no duration given) | 3 minutes per logged set | `config.ts:151` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.4 | Energy per step | 0.0004 kcal per step per kg, already net of resting | `config.ts:152` | Placeholder from `docs/ACTIVITY.md`. Example: 10,000 steps at 80 kg is about 320 kcal. | |
| 6.5 | Cycling MET | 6.8 | `config.ts:155` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.6 | Running MET | 8.0 | `config.ts:156` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.7 | Swimming MET | 6.0 | `config.ts:157` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.8 | Team sports MET | 7.0 | `config.ts:158` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.9 | Dancing MET | 5.0 | `config.ts:159` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.10 | Other cardio MET | 5.0 | `config.ts:160` | Placeholder from `docs/ACTIVITY.md`. | |
| 6.11 | No walking option | Walking is not in the list, because steps already count it | `config.ts:153` | Avoids counting walking twice. | |
| 6.12 | Steps limit | 0–100,000 a day | `config.ts:165` | Technical limit; matches the database check. | |
| 6.13 | Sleep limit | 0–1,440 minutes (0–24 hours) a night | `config.ts:166` | Technical limit; matches the database check. | |
| 6.14 | Other activity limit | 1–600 minutes an entry | `config.ts:167` | Technical limit; matches the database check. | |
| 6.15 | Workout duration limit | 1–600 minutes, optional | `config.ts:168` | Technical limit; matches the database check. | |
| 6.16 | Steps and Sleep average window | The last 7 days (local dates), ending today | `config.ts:96` | Same window as the weight trend (row 3.1); shown on Progress for information only. | |
| 6.17 | Steps and Sleep average needs | At least 3 days with a number, otherwise "Not enough data yet." | `config.ts:96` | Same rule as the weight trend (row 3.1). | |

## Not for this review

Technical limits that are not health advice: meal and workout row limits (`docs/RUNBOOK.md`, error 54000), item grams up to 2,000, reps up to 100, holds up to 600 s, weights up to 500 kg, meal planner portion ranges (`docs/MEAL-PLANNER.md`). A reviewer may still comment on them.

## Sign-off

| Section | Reviewer name | Qualification | Date | Signature or email |
|---|---|---|---|---|
| 1. Calorie estimate | | | | |
| 2. Macros | | | | |
| 3. Progress and check-in | | | | |
| 4. Training | | | | |
| 5. Safety and legal copy | | | | |
| 6. Activity estimates | | | | |
