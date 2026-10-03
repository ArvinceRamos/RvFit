# RvFit Build Plan



## Product scope



Build a beginner-friendly fitness website first. A mobile app may come later.



V1 covers calorie and macro targets, a starter food library, rule-based meal suggestions, workout templates, workout and progress tracking, and saved user data. Keep the interface simple. Do not add AI meal plans, full recipes, advanced workout levels, or unplanned features.



The first audience decision is still open: personal/family use first or public launch. This does not block local Phase 1 work. Decide before deployment.



## Configuration and product rules



Keep calculation values in one plain TypeScript configuration/calculation module. The values below are placeholders pending qualified review.



### Calorie estimates



Use Mifflin–St Jeor:



- Male: `10 × weight_kg + 6.25 × height_cm − 5 × age + 5`

- Female: `10 × weight_kg + 6.25 × height_cm − 5 × age − 161`



Multiply by a configurable activity multiplier. Proposed placeholders:



- Sedentary: `1.20`

- Light: `1.375`

- Moderate: `1.55`

- Very active: `1.725`

- Extra active: `1.90`



Apply the goal adjustment after the activity multiplier and before the formula-branch floor:



- Weight loss: two pace options in config, gradual 250 kcal and steady 500 kcal (placeholders). Also keep a separate configurable maximum deficit in config, placeholder 500, applied in code as a limit. Do not hard-code these numbers in logic.

- Weight gain: two pace options in config, gradual 100 kcal and steady 200 kcal (placeholders).

- Maintenance: no adjustment.



Proposed formula-branch floor placeholders are 1,500 kcal for male and 1,200 kcal for female. If the adjusted result falls below its branch floor, show the floor as the target with a brief explanation. A manual target uses the lowest configured floor; reject lower entries and explain why.



Show calculator results as starting estimates that users can compare with their weight trend, not as exact values.



### Macro targets



Proposed defaults:



- Protein: `1.6 g/kg`, limited to no more than 35% of target calories.

- Fat: at least 20% of target calories by default.

- Carbohydrates: fill the remaining calories.

- Fiber: `14 g per 1,000 kcal`.

- For energy calculations use 4 kcal/g for protein and carbohydrates and 9 kcal/g for fat. Fiber is included within carbohydrate grams.



Allow macro editing. Reject negative macro grams and protein above the 35% cap. Show a warning when macro-derived calories differ from the calorie target by more than 5%. A mismatch warning does not itself reject an otherwise valid edit.



### Input and safety rules



- Configurable calculator input ranges: age 18–100, height 120–230 cm, weight 30–300 kg.

- Convert imperial inputs to metric before range validation.

- The target-method screen requires the checkbox “I am 18 or older” before either target path. The calculator also rejects ages under 18 with an error and no results. This is self-reported, not age verification.

- Goal labels include short descriptions. Maintain mentions that it is also a common choice for slowly losing fat and building muscle. This copy is a placeholder pending reviewer approval.

- Calculator sex field label: “Sex (used in the calorie formula): Male / Female”. Sex is required for the calculator.

- Manual targets skip sex and ask for current weight. Validate the entered target against the configured floor and database bounds; do not recalculate it using the calorie formula.

- Pregnancy and breastfeeding are out of scope for V1. Do not add separate notices or confirmations for them. Use this disclaimer on calculator results and in the footer:



 “These are estimates for healthy adults and are not medical advice. If you are pregnant, breastfeeding, or have a medical condition, talk to a doctor before changing your diet.”



## Stage 0 — Prepare content and decisions



Complete before Phase 2 and Phase 3. Phase 1 may start without it:



- Finalize the screen flow, concise product copy, data outline, and phase acceptance checks.

- Prepare workout content for every required split, level, and equipment option: exercises for each day, sets, reps, rest, and swaps. Use shared split structures to avoid unnecessary duplication. Save the content as TypeScript or JSON files that Phase 3 will use.

- Workout split coverage:

 - 2 days: full body A/B

 - 3 days: full body A/B/C

 - 4 days: upper/lower

 - 5 days: push/pull/legs plus upper/lower

 - 6 days: push/pull/legs twice

- Support beginner and intermediate levels. Offer 5–6 training days only for intermediate users. Support bodyweight, dumbbell-only, and gym equipment.

- Prepare a seed list of about 150–300 food entries. Include food role, diet tags, and raw or cooked state; keep raw and cooked entries distinguishable. Add common measures when the USDA record provides them.

- Write plain-language rules for meal suggestions that choose protein, carb, and fat foods to help fit remaining macro targets and exclude allergies and preferences.

- Select a reviewer, such as a registered dietitian for calorie, macro, fiber, food, and disclaimer content. Arrange qualified review of workout content as appropriate.

- Keep all clinical/configuration values marked as placeholders until reviewed.



**Done when:** the product flow, content checklist, food seed list, workout files, suggestion rules, placeholder values, and reviewer plan are documented. All required workout combinations have content coverage.



## Phase 1 — Foundation, calculator, and saved account



Use Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth/Postgres, Vitest, and Vercel. For this phase, build and test locally only; do not deploy. Use the Supabase CLI local setup if available. Keep keys in an untracked `.env.local`.



Build the simple text landing page, target-method flow, calculator, results, authentication, and a minimal signed-in page.



### Guest and signed-in flow



- Guest draft data stays in `localStorage`, not `sessionStorage`.

- Store the profile inputs, target, initial body log, macro edits, stable `guest_draft_id`, and `adult_confirmed_at`.

- Save the draft when the user first has a signed-in session, including after email confirmation.

- If email is confirmed on another device and there is no local draft, show: “Draft not found. Return to the browser or device where you started setup to save your draft.”

- Keep the local draft after any validation or save error. Clear it only after a successful save.



### Schema and atomic save



Create `profiles`, `calorie_targets`, and `body_logs`.



- Every `user_id` foreign key uses `ON DELETE CASCADE`.

- Enable RLS on all three tables, with policies that limit access to the authenticated owner.

- Add a unique constraint on `(user_id, guest_draft_id)` in `calorie_targets`.

- Use profile upsert during initial save.

- `profiles` columns: `user_id` (primary key), `age_years`, `sex_formula_branch`, `height_cm`, `activity_level`, `preferred_units`, `adult_confirmed_at`, `created_at`, `updated_at`. `age_years`, `sex_formula_branch`, `height_cm`, and `activity_level` must allow null, because manual-target users do not enter them.
- `calorie_targets` columns: `id`, `user_id`, `guest_draft_id`, `source` (calculated or manual), `target_kcal`, `goal`, `pace`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `formula_branch`, `floor_applied`, `config_version`, `calculation_inputs` (JSONB), `created_at`. `goal`, `pace`, and `formula_branch` allow null for manual targets.
- `body_logs` columns: `id`, `user_id`, `logged_at`, `weight_kg`, `waist_cm`, `chest_cm`, `hips_cm`.
- `calorie_targets` stores calorie and macro targets. Goal and pace are nullable for manual targets; pace is null for maintenance. Current target is the row with the latest `created_at`.

- Add a loose database check requiring `target_kcal` to be 800–6000. The real minimum is the configured floor.

- `body_logs` stores user ID, logged date/time, optional `weight_kg`, `waist_cm`, `chest_cm`, and `hips_cm`. A weight average uses only rows with a weight.



Use a Postgres save function with `SECURITY INVOKER`; it must not reimplement the calorie or macro formulas. The Next.js server action or route handler validates and recalculates with the TypeScript module, then calls the function.



The save function must:



1. Confirm the user ID passed in matches the signed-in user (`auth.uid()`). Reject otherwise.

2. If the same user and draft key already exist, make no changes and return success.

3. If a different calorie target already exists for the user, make no changes and return a message that a saved target exists, so a stale draft cannot replace it.

4. Catch unique violations and handle them without overwriting existing data; treat a matching-key race as an idempotent success.

5. If no target exists, atomically upsert the profile and save the target and initial body log.



On the server, recalculate calculator targets and default macros, then preserve user-edited macro values if they pass validation. For manual targets, validate the submitted value against the configured floor and database bounds; do not recalculate it from profile details.



### Minimal signed-in page and account access



- Show the saved calorie target and macros.

- Add a simple weigh-in form with optional waist, chest, and hip measurements.

- Provide sign-up, email confirmation, log in, log out, and password reset.

- Add the approved health disclaimer to the results screen and footer.



**Done when:** a hands-on local walkthrough verifies calculator and manual paths, age and range rejection, floor enforcement, email confirmation, weigh-in entry, refresh preserving the guest draft, idempotent save, and login/logout/password reset. A second user cannot read the first user’s rows. Automated Vitest tests pass.



## Phase 2 — Food library, preferences, and meals



Import USDA Foundation and SR Legacy data once with a local script. Do not import Branded data. The live website never calls USDA. Keep any USDA API key out of public code and in local environment configuration.



Add our own food roles because USDA does not supply them:



- Protein, carb, fat, vegetable, fruit, other.



Add these diet tags:



- Meat, fish, shellfish, dairy, egg, gluten, peanuts, tree nuts, soy, sesame.



Prepare about 150–300 seeded entries. Label raw or cooked state clearly. Use grams as the base and provide common measures when available.



Build the preferences screen for allergies, food preferences, experience, equipment, and training days. Only offer allergy selections that match tags actually present in the catalog. Meal suggestions must exclude foods matching selected allergies and preferences.



Let users pick protein, carb, and fat foods and amounts. Implement the Stage 0 plain-language rules for simple macro-aware suggestions. V1 does not include AI-generated plans or full recipes.



Add meal and meal-item records for saved foods and portions.



**Done when:** a hands-on walkthrough finds seeded foods, distinguishes raw/cooked states, saves a meal, and confirms that suggestions exclude foods matching the user’s available allergy tags and preferences.



## Phase 3 — Workouts only



Keep workout templates and exercises in project TypeScript or JSON files. Do not create `exercises` or `workout_templates` database tables. Workout records store template and exercise IDs as text keys.



Implement the Stage 0 templates and content:



- 2–4 day options for beginner and intermediate users.

- 5–6 day options for intermediate users only.

- Bodyweight, dumbbell-only, and gym equipment options.

- Basic exercise swaps.

- Workout logging.

- Optional progression prompts. Do not add a workout logging confirmation checkbox.



Keep dashboards, weekly-plan views, progress views, and Profile and targets for Phase 4.



**Done when:** a hands-on walkthrough selects a valid template for level, schedule, and equipment; swaps an exercise; logs a workout; and sees an optional progression prompt.



## Phase 4 — Dashboard, weekly plan, progress, and profile



Build a signed-in dashboard with today’s calories and macros, meals, workout, and quick actions. Add the weekly plan view and progress view.



Weight trend is the average of weigh-ins with a weight value in the last seven days. If there are fewer than three such weigh-ins, show **“Not enough data yet.”**



Add the Profile and targets screen:



- Let users edit profile details and goals, recalculate the target, edit protein/carbohydrate/fat/fiber grams, and save a new `calorie_targets` row.

- Show the same over-5% macro-mismatch warning as the results screen.

- The newest target row by `created_at` is current. The app never changes targets automatically; users review and edit targets themselves.

- Show **“Age last entered”** for age.

- Add **Delete my account and data** with a confirmation step. Run deletion on the server, verify the authenticated user, and remove the account and associated user data. Never expose a privileged server key to the browser.



**Done when:** a hands-on walkthrough confirms the dashboard and weekly plan reflect saved user data; fewer than three weigh-ins show “Not enough data yet”; target edits create a new current row and use the macro warning; and a confirmed deletion removes a demo user’s account and associated data.



## Phase 5 — Roadmap landing page



Replace the Phase 1 text landing page only after the core app screens are finished.



Use screenshots from a seeded demo account with fake data. Label each screenshot **App preview** and retake it when its screen changes. Do not use fake testimonials, user counts, or outcome promises.



Use a short five-stage scrolling roadmap:



1. **Know your numbers** — choose a calorie estimate or enter your own target, then review calorie and macro targets.

2. **Fuel your day** — pick protein, carb, and fat foods, then use simple suggestions to help fill macro targets.

3. **Train your week** — choose a workout template for your schedule, equipment, and experience.

4. **Track your trend** — log weigh-ins and review your 7-day average alongside your activity.

5. **Review and adjust** — review progress and edit targets yourself. The app never changes targets automatically. Use the Profile and targets screen as this preview.



Keep these hero actions visible without waiting for 3D: **Get my starting estimate**, **See the roadmap**, the smaller **Enter my own target** link, and **Log in**.



Keep the macro-dial hero as a desktop 3D enhancement with a static phone and reduced-motion fallback. The roadmap itself is a plain scrolling timeline and does not depend on 3D. If the phase grows too large, cut 3D first.



Keep the illustrative sample result card without calorie math. Include this honest-estimates line:



> A starting estimate, not a promise. Review your weight trend over time, then decide whether to edit your target.



Use the sampled palette fills: `#AFFA00` Fit Green, `#CFED89` pale Fit Green, `#1C1C1C` near-black, and `#000000` black. The white swatch’s dominant pixel fill is `#FFFFFF`, though its printed label says `#FEF9F5`. Treat `#FEF9F5` as the intended off-white token only if that is the chosen design color; it is not the sampled fill. **Never use Fit Green as text on white or off-white.**



**Done when:** a hands-on walkthrough follows the five stages and each links to the right real app screen preview. All screenshots use fake demo data and are refreshed when those screens change. Primary actions work and stay visible before 3D loads; the page works on phones, with reduced motion, and with 3D disabled.



## Launch review and deployment



Do not make the website public until the placeholder calorie floors, weight-loss deficit cap, activity multipliers, protein coefficient, macro rules, and disclaimer have been reviewed by appropriate people.



Publish and review a privacy policy page, terms page, and contact email together with the disclaimer. Review user data access, account deletion, retention and deletion wording, authentication, and secret handling. Keep USDA access limited to the local import.



Deploy to staging first. Configure production Supabase and Vercel environment variables, apply migrations, seed the food catalog, and manually verify sign-up, email confirmation, login, logout, password reset, saving, target editing, deletion, meals, workouts, and mobile behavior.



**Done when:** the intended audience and release scope are decided; reviewers have approved launch-sensitive values and copy; privacy, terms, and contact details are published; and production smoke checks pass without exposing secrets or another user’s data.

