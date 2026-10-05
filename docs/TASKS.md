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
