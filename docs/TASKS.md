# RvFit Task List
Phase 1 jobs. Mark [x] only when the job is done and checked.
- [x] Job 1: Set up Next.js, Tailwind, Vitest
- [x] Job 2: Calculation module and tests
- [x] Job 3: Supabase local setup and migrations (tables, RLS, cascade, save function)
- [x] Job 4: Calculator screens, target-method screen, results, guest draft in localStorage
- [x] Job 5: Sign-up, email confirmation, log in, log out, password reset
- [x] Job 6: Server action that validates with the calculation module and calls the save function
- [x] Job 7: Signed-in page with saved target and weigh-in form
- [x] Job 8: Final Phase 1 hands-on check and tests

Suggested model per job: Job 3 Terra high. Jobs 4–7 Terra medium. Job 8 Luna medium.

# Phase 2 jobs. Mark [x] only when the job is done and checked.
- [x] P2-1: Document Phase 2 flow, data rules, launch review gate, and 180 candidate food names; align Stage 0 timing 

- [x] P2-2: Add foods, food measures, user preferences, avoided foods, meals, meal items, constraints, RLS, and local migration checks 
- [x] P2-3: Search official Foundation and SR Legacy downloads by candidate name; prepare reviewed mappings and skip report; show first 20 foods and wait for approval before import 
- [x] P2-3b: Import the approved mappings into the local catalog with a one-time local script. Read fdc_ids only from the approved CSV. Verify row counts and that missing fiber stays null.
- [x] P2-4: Build signed-in food library and preferences screens with only catalog-present allergy tags and the required allergen notice 
- [x] P2-5: Build meal builder/saving and tested per-100 g nutrition calculations; preserve missing fiber and enforce the placeholder per-item gram maximum 
- [x] P2-6: Build and test deterministic macro-aware food suggestions with allergy and avoided-food exclusions, then connect the screen 
- [x] P2-7: Run Phase 2 local walkthrough and relevant checks; update this list only for jobs whose checks pass 

# Phase 3 jobs. Mark [x] only when the job is done and checked.
- [x] P3-1: Document Phase 3 flow, data rules, content format, swap and progression rules, and review gate in docs/PHASE3.md; add these jobs (Sonnet 5.5 medium)
- [x] P3-2: Build typed workout content, shared splits, and the resolver with matrix tests; write a sample plan for each split and a coverage report; stop and wait for review before P3-3 (Opus 5.5 high)
- [x] P3-3: Add workout log, set, and swap tables, RLS, limits, and the atomic save_workout_log function; test in rolled-back SQL (Opus 5.5 high)
- [x] P3-4: Build the Workouts plan page and nav item, choosing the template from saved Preferences, with a no-preferences state (Sonnet 5.5 medium)
- [x] P3-5: Build exercise swaps: valid options, saved swaps, Swap and Reset to default (Sonnet 5.5 medium)
- [x] P3-6: Build workout logging with validation and units, new and edit forms, and the recent workouts list (Opus 5.5 high)
- [x] P3-7: Build optional progression prompts from the last logged session and show them on the new-workout screen (Sonnet 5.5 medium)
- [x] P3-8: Run the Phase 3 local walkthrough, security checks, and relevant checks; update this list only for jobs whose checks pass (Sonnet 5.5 medium)

# Phase 4 jobs. Mark [x] only when the job is done and checked.
- [x] P4-1: Document Phase 4 flow, data rules, decisions, and acceptance checks in docs/PHASE4.md; add these jobs (Sonnet 5.5 medium)
- [x] P4-2: Meal data and logic: labels Meal 1-6 with the one-per-day database rule and friendly duplicate error, slot mapping logic, delete action, labels used on a date; tests and rolled-back SQL (Sonnet 5.5 medium)
- [x] P4-3: Rebuild the meal builder: Protein, Carbs, Fat, and Fiber slots plus Add another food, label dropdown, form clears after a new save, two-column layout on the meal pages (Opus 5.5 high)
- [x] P4-4: Meals page: today's calories and macros summary at the top and Delete with a Yes or No confirmation (Sonnet 5.5 medium)
- [x] P4-5: Build tested shared logic: local date and Monday-to-Sunday week, day totals and fiber rule, weight trend (7 days, 3 minimum), workouts per week, and the `progress` placeholders; add the server actions that load them (Sonnet 5.5 medium)
- [x] P4-6: Build the Dashboard, move login and save redirects to it, update the nav, retire /account into redirects (Sonnet 5.5 medium)
- [x] P4-7: Build the read-only Weekly plan page (Sonnet 5.5 medium)
- [x] P4-8: Build the Progress page: weigh-in form moved from Account, trend, history, weight chart, workouts per week (Sonnet 5.5 medium)
- [x] P4-9: Add the atomic save_profile_and_target function and build Profile and targets: edit details, recalculate, edit macros with the 5% warning, "Age last entered", new target row; test in rolled-back SQL (Opus 5.5 high)
- [x] P4-10: Build Delete my account and data: confirmation step, server-only admin deletion of the verified caller, tests with throwaway users only (Opus 5.5 high)
- [x] P4-11: Run the Phase 4 local walkthrough, security checks, and relevant checks; update this list only for jobs whose checks pass (Sonnet 5.5 medium)

# UI refresh jobs (see docs/UI-REFRESH.md). Mark [x] only when the job is done and checked.
- [x] UI-1: Write docs/UI-REFRESH.md (layout per page, colour tokens, rules, acceptance checks) and add these jobs. Docs only (Sonnet 5.5 medium)
- [x] UI-2: Make 1152px the default width for signed-in pages; define the dark tokens and shared card and button classes; rebuild Dashboard, Week and Workouts as card grids with a single-row header (Sonnet 5.5 medium)
- [x] UI-3: Rebuild Progress, Profile, Food library and Preferences as side-by-side layouts (Sonnet 5.5 medium)
- [x] UI-4: Apply the dark tokens across all remaining pages, check contrast, run tsc, lint and tests, and do a hands-on walkthrough with a throwaway user (Sonnet 5.5 medium)
- [x] UI-5: Charcoal page with a soft Fit Green glow, light mode with a header toggle (follows the device on first visit, then remembers), tokens for both themes, contrast checked (Sonnet 5.5 medium)
- [x] UI-6: Rebuild Progress: stat tiles, large weight chart with soft green fill and 7 / 30 / 90 day / All range buttons, shorter inputs, two columns from 768px, workouts-per-week bars (Sonnet 5.5 medium)
- [x] UI-7: Remove the page glow (flat backgrounds in both themes); Progress tiles: solid Fit Green Latest weight tile with a neutral 30-day change chip, and a workouts ring against planned training days (Sonnet 5.5 medium)
- [x] UI-8: Align Progress on one 3-column grid (equal-height cards, scrolling History); black text on every Fit Green button; delete a recent workout with a Yes/No confirmation (new delete policy, rolled-back SQL test) (Sonnet 5.5 medium)

# Meal planner jobs (see docs/MEAL-PLANNER.md). Mark [x] only when the job is done and checked.
- [x] MP-1: Write docs/MEAL-PLANNER.md and add these jobs; show the USDA whey values, import whey after approval (Sonnet 5.5 medium)
- [x] MP-2: Planner engine in src/lib/meal-planner.ts: day budgets, free labels, rotations, gram solver with rounding and caps, notes; Vitest tests (Opus 5.5 high)
- [x] MP-3: Atomic save_meal_plan database function and saveMealPlanAction with server re-validation; rolled-back SQL tests (Opus 5.5 high)
- [x] MP-4: Meal plan page /meals/plan: chip pickers, Day/Week, meals per day, rotations, preview, Save as meals with Yes/No (Sonnet 5.5 medium)
- [x] MP-5: Walkthrough with a throwaway user using the agreed examples; run tsc, lint, and tests (Sonnet 5.5 medium). Done as part of MP-9.
- [x] MP-6: Write "Realistic portions" in docs/MEAL-PLANNER.md (research, user decisions, portion classes, rules) and draft docs/portion-classes-review.csv for the 91 planner foods; stop for review (Sonnet 5.5 medium)
- [x] MP-7: After the class list is approved: portion_class and portion_unit_g on foods with a check constraint, CSV columns, import script update and rerun, count check, rolled-back SQL checks (Opus 5.5 high)
- [x] MP-8: Planner engine v2: bounded solver with class ranges and unit rounding, second food, whey shake, new notes; tests incl. the 2,565 kcal example at 2-6 meals (Opus 5.5 high)
- [x] MP-9: Save checks for up to 6 items and 2 foods per group, units and Shake in the preview, then the MP-5 walkthrough; run tsc, lint, and tests (Sonnet 5.5 medium)
- [x] MP-10: Eaten checklist data: meals.from_plan and meals.eaten (plan meals start unticked), setMealEatenAction, totals count only eaten meals (Dashboard, Week, day totals), planner still counts all saved meals; tests and rolled-back SQL (Opus 5.5 high)
- [x] MP-11: Meals page as day cards with Today / Upcoming / Past tabs, foods and grams per meal, eaten checkboxes on Meals and Dashboard, Week shows eaten and planned, Today card shows planned kcal; walkthrough (Sonnet 5.5 medium)
- [x] MP-12: Prep for the day: each open day card lists every food summed across all meals (eaten and planned), weights as picked; tests (Sonnet 5.5 medium)
- [x] TG-1: Clearer goal and pace wording (Slow / Faster with weekly estimates, goal text for each kind of person) and a balanced full-width Profile layout; stored values unchanged (Sonnet 5.5 low)
- [x] TG-1b: Profile polish: Sex joins the weight/age/height row, five activity cards in one row (no hole on tablet), result scrolls into view after Recalculate (Sonnet 5.5 low)
- [x] TG-1c: Profile form as a two-column bento of cards (setup, your details, activity, goal with How fast?), options stacked in columns, rows share height; one column on smaller screens (Sonnet 5.5 low)
