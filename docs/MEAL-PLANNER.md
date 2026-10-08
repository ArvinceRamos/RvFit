# Meal planner

Local only. Do not deploy. Jobs MP-1 to MP-5 in `docs/TASKS.md`.

The user picks the foods they have. The planner builds a day or week of meals that fits their saved calories and macros, using fixed, deterministic rules. It is not AI and has no recipes.

## Rule exceptions (the user's decision, 2026-10-07)

- `docs/PLAN.md` line 13 says V1 has no "AI meal plans". This planner is rule-based, not AI, but it is a new feature beyond the original V1 scope. The user asked for it and approved it.
- `docs/PHASE2.md` suggestion rule 5 says "suggest foods, not portion sizes". The planner sets gram amounts. That rule still applies to the existing suggestions panel in the meal builder, which stays unchanged.

No new health or safety wording. The existing footer disclaimer and "starting estimate, not a promise" tone apply.

## Decisions

| Topic | Decision |
| --- | --- |
| Where | New page `/meals/plan`, opened from a "Plan meals" button on Meals. No new nav item. |
| Plan length | Day, or Week (7 days from a start date, default today). |
| Meals per day | User picks 2–6, default 3. Saved as Meal 1–6. |
| Food picking | Search box with type-ahead (the existing `FoodAutocomplete`) that adds removable chips under Protein, Carbs, and Fats. A row of common foods works as one-tap chips (top picks from the existing suggestion ranking). |
| Week rotation | Chosen per group: **Same** (first food every day), **Mix** (all picked foods spread over the meals of each day), **Alternate** (one food per day, in turn). Day plans always mix. |
| Saving | Preview first. "Save as meals" (with a Yes/No confirmation) saves normal meals on the chosen days, so Dashboard, Week, and day totals update. |
| Days with meals already logged | Plan only the calories and macros left that day, using the free labels. Logged meals are never changed. |
| Whey protein | Add from USDA SR Legacy after the user approves the values (see below). |

## Inputs and limits

- The latest saved calorie target (`calorie_targets`). With no target the page shows the existing "Set up a target" message.
- Foods: only the user's picks. Allergy-tagged and avoided foods cannot be picked (`isExcluded` in `src/lib/suggestions.ts`). Only foods in the Protein, Carbs, and Fats groups (`role` protein, carb, fat).
- Limits (placeholders in `src/lib/calc/config.ts`): at most 7 days, 6 meals per day, 5 foods per group. Each item 1 g to `maxMealItemGrams` (2,000 g); the database check also applies.

## Plan rules

1. **Day budget.** Remaining = target − totals of meals already saved that day (`remainingTargets`). Free labels = Meal 1–6 minus used labels. Meals = the smaller of the chosen count and the free labels. Remaining calories at or below 0 → the day is "Already met", no meals.
2. **Meal budget.** Each meal gets an equal share of the day's remaining protein, carbs, and fat.
3. **Food per meal.** Each meal uses one protein, one carb, and one fat food:
   - Mix: meal *i* uses that group's food *i* mod *k*.
   - Same: always the first food.
   - Alternate: day *d* uses food *d* mod *k*.
4. **Grams.**
   - Solve for the three foods' grams so protein, carbs, and fat match the meal budget. This is a 3×3 linear system using each food's per-100 g values.
   - If an amount comes out below 0, set that food to 0 and solve again with the others.
   - With no food in a group, solve with the groups that are left.
   - Round to 5 g, or 1 g for foods with 50 g or more fat per 100 g (oils).
   - Cap at the item maximum. Drop items that round to 0 g.
5. **Totals.** Use `itemNutrition`, `mealTotals`, and `addTotals` from `src/lib/meal.ts`. Fiber is shown but not targeted. "Incomplete" when a food has no fiber value.
6. **Notes.** When a day's protein, carbs, or fat ends more than 10% from its budget, show a plain note, for example "Fat is 18 g short. Add a fat food." or "Protein is over because your carb food has protein." No promises, no judgement.
7. **Deterministic.** Same inputs, same plan. No randomness.

## Realistic portions (MP-6 to MP-9)

Rules 3 and 4 above hit the macros exactly but ignore how people eat. A 2,565 kcal test day (109 g protein, 394 g carbs, 57 g fat) with chicken breast, white rice, whey, and olive oil gave:
- 690–700 g cooked rice per meal in a 2-meal day (about 4.4 cups);
- whey treated like chicken ("whey 45 g + rice 690 g + olive oil 26 g") in odd amounts (15, 20, 45 g);
- 55–65 g chicken per meal in 5–6 meal days, below a 3 oz serving;
- 22–26 g olive oil in one meal, close to a whole day's oil allowance.

With rice as the only carb, that target needs about 1,400 g cooked rice a day. No rounding rule hides that, so the planner should keep portions normal and say what is missing. When MP-8 lands, the rules below replace rules 3 and 4 (grams). Rules 1, 2, 5, and 7 stay.

### Decisions (the user's, 2026-10-08)

| Topic | Decision |
| --- | --- |
| Shortfall | Stay realistic. Never go above a food's normal portion. Show a note with what is short and what to add. |
| Portion ranges | Each Protein, Carbs, and Fats food gets one reviewed portion class. Ranges per class are placeholders in `src/lib/calc/config.ts`. |
| Whey and powders | A standalone shake in whole scoops, at most 2 scoops a day, never with a carb or fat food. Used only to top up protein. |
| Second food | When a food is at its maximum and its macro is still short, the meal may add the next picked food from the same group. |
| Meals per day | The day's total, logged meals included. Meals to plan = chosen count − meals already logged that day, capped by the free labels. At 0 or less with calories left, plan nothing and show "3 meals are already logged and 640 kcal are left. Raise meals per day to plan more." Replaces rule 1's count in MP-8. |

### Research basis

Placeholder values, pending qualified review like all config.
- Protein per meal: about 0.4 g/kg per meal across at least 4 meals ([Schoenfeld and Aragon, 2018](https://pubmed.ncbi.nlm.nih.gov/29497353/)). The 2025–2030 Dietary Guidelines say to prioritize protein at every meal.
- Serving references: cooked meat, poultry, or fish 2–3 oz (57–85 g), about a palm; ½ cup cooked grains is one grain serving, and 1 cup cooked rice is 158 g in the catalog ([Montana State University Extension, serving sizes](https://www.montana.edu/extension/buyeatlivebetter/other_nep_resources/fact_sheets/servingsizes/index.html)).
- Oils: about 27 g a day at 2,000 kcal; 1 tbsp olive oil is 13.5 g.
- Whey: a scoop is usually 25–35 g. The catalog measure is 32 g.
- Diet-optimization research: linear-programming diets meet nutrients but are not palatable. The usual fix is a minimum and maximum number of servings per food ([NEOS Guide, the diet problem](https://neos-guide.org/case-studies/om/the-diet-problem/)).

### Portion classes

Per meal. "Unit" classes count whole units of `portion_unit_g`, taken from a catalog measure. The class list for all 91 foods is in `docs/portion-classes-review.csv` for review before import.

**Approved and imported on 2026-10-08 (MP-7).** `foods` has `portion_class` and `portion_unit_g` with check constraints. The values come from two new columns in `docs/phase2-usda-mapping.csv` via the existing import script, which now checks that every Protein, Carbs, and Fats food has a class and that only unit classes have a unit.

| Class | Foods | Per meal | Step |
| --- | --- | --- | --- |
| meat_fish_cooked | cooked meat, poultry, fish, shrimp; canned tuna | 60–225 g | 5 g |
| meat_fish_raw | raw meat, poultry, fish, shrimp | 80–300 g | 5 g |
| egg | whole egg, raw or hard-boiled | 1–4 units (50 g) | 1 unit |
| egg_white | egg white | 1–6 units (33 g) | 1 unit |
| dairy_protein | Greek yogurt, cottage cheese | 100–300 g | 5 g |
| plant_protein | tofu, tempeh, lentils | 80–250 g | 5 g |
| powder | whey | 1–2 units (32 g) a day, shake only | 1 unit |
| grain_cooked | cooked rice, pasta, quinoa, bulgur, couscous, barley, oatmeal | 75–320 g (½–2 cups) | 5 g |
| grain_dry | dry rice, pasta, oats, quinoa, bulgur, couscous, barley | 25–110 g | 5 g |
| bread | bread, tortillas, pita | 1–4 units | 1 unit |
| starchy_veg | potato, sweet potato, corn, black beans | 75–350 g | 5 g |
| oil | oils, butter, mayonnaise | 2–14 g (up to 1 tbsp) | 1 g |
| nut_seed | nuts, seeds, nut butters, tahini, dark chocolate, dried coconut | 10–40 g | 5 g |
| avocado_olive | avocado, olives | 30–150 g | 5 g |
| dairy_fat | cream cheese, sour cream, coconut milk | 15–60 g | 5 g |

### Rules (replace rules 3 and 4 in MP-8)

1. **Foods per meal.** One protein, one carb, and one fat food per meal, picked by the same rotations (Same, Mix, Alternate). Powder foods are never picked for a normal meal.
2. **Grams.** Solve each meal for the closest fit to its budget, with each food either left out (0 g) or kept within its class range. Errors are weighed in kcal, as now. The best fit wins; ties keep more foods.
3. **Second food.** If a food is at its maximum and that group's macro is still more than 10% short for the meal, add the next picked food of that group (rotation order) and solve again. At most 2 foods per group per meal.
4. **Rounding.** Round to the class step. Unit classes round to whole units. Below the minimum becomes 0 g (dropped); never above the maximum. The 2,000 g item cap still applies.
5. **Shake.** After the meals, if the day's protein is more than 10% short and whey is picked, add one shake under the next free label: whey only, 1 or 2 whole scoops (the closer fit). With no free label, no shake and a note. If whey is the only protein food, meals are planned without protein and the shake tops up.
6. **Notes.** Say what is short and why, plainly. Examples: "Carbs are 214 g short. Rice is at its largest portion (320 g) in every meal. Add another carb food or more meals." "Fat is 17 g short. Olive oil is at 14 g per meal." Over-notes keep the "because your carb food has protein" form.

### Save and display changes (MP-9)

- Save checks: at most 6 items per meal, at most 2 foods per group per meal, and a meal with a powder food holds only powder foods. Grams still go through `validateMeal`. The database function does not change.
- Preview: units are shown with grams, for example "1 scoop (32 g)" and "2 eggs (100 g)". A shake meal is labelled "Shake".

## Eaten checklist (MP-10, MP-11)

The user's decisions (2026-10-08):
- Meals saved by the planner start as planned (`from_plan` true, `eaten` false). Since AU-43 (2026-10-08, the user's choice) meals from "New meal" and "Log again" also start unticked, so nothing counts until it is ticked. Meals saved before AU-43 keep their tick.
- Day totals (Today card, Dashboard, Week, kcal left) count only meals ticked as eaten. Planned meals are shown apart, for example "+1,225 kcal planned".
- Every meal gets an "I ate this" checkbox on the Meals page and the Dashboard (AU-43; before, only planner meals had one). Future days cannot be ticked.
- The planner still counts every saved meal, planned or eaten, so a day is never planned twice.
- The Meals page shows day cards (tap to open) with Today, Upcoming, and Past tabs.
- "Prep for the day" (MP-12): an open day card with 2 or more meals lists each food summed across all its meals, eaten and planned, in the weight it was picked (cooked foods in cooked grams; no raw conversion).

## Save rules

- One server action re-validates everything on the server: each meal with `validateMeal`, the limits, and the free labels. Items carry only `food_id` and grams. Client nutrition is never trusted.
- One database function saves the whole plan in a single transaction, so it is all or nothing. The existing unique index on `(user_id, meal_date, label)` protects logged meals. A clash saves nothing and shows a friendly message.
- Row-level security as for meals: users only write their own rows.

## Whey protein (MP-1)

Not in the 179-food catalog. Candidates from the local SR Legacy download (`data/usda/sr-legacy-2018-04`):

| fdc_id | USDA description | kcal | Protein | Carbs | Fat | Fiber | Measure |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **173180** (proposed) | Beverages, Protein powder whey based | 352 | 78.13 | 6.25 | 1.56 | 3.1 | 0.33 cup (32 g) |
| 173177 | Beverages, Whey protein powder isolate | 359 | 58.14 | 29.07 | 1.16 | 0 | 1 scoop (86 g) |

Per 100 g. Proposed catalog row:
- Name "Whey protein powder", role protein, preparation state other, diet tag dairy, fdc_id 173180.
- 173177 is not proposed because its 29 g carbs and 86 g scoop suggest a sweetened shake mix.
- Branded Foods were not searched.

**Approved and imported on 2026-10-07** as fdc_id 173180. The local catalog now has 180 foods and 308 measures, and the import script's count check passed. Import method: It adds one row to `docs/phase2-usda-mapping.csv` and reruns the existing upsert script (`scripts/import-phase2-catalog.mjs`). The script upserts by fdc_id and checks the counts.

## Acceptance checks

A hands-on walkthrough with a throwaway local user:
- **Week:** chicken breast and 90/10 beef, rice and sweet potato, avocado and olive oil. Each rotation gives the expected food pattern, and each day lands within 10% of the macros or shows a note.
- **Day:** chicken breast, rice, olive oil, and whey.
- **Partly logged day:** only the remaining macros are planned, under free labels, and logged meals stay unchanged.
- **Exclusions:** allergy-excluded and avoided foods cannot be picked.
- **After save:** Meals, Dashboard, and Week show the new meals. A label clash saves nothing.
- **Layout:** works in dark and light, at laptop and 375 px width.

Plus:
- `npx tsc --noEmit`, `npm run lint`, and `npm test` pass, including the planner engine tests.
- Rolled-back SQL tests for the save function: all or nothing, label clash, and other users' rows.
- Never run `supabase db reset`. Use throwaway users only.
