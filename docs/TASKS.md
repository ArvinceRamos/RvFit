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

# Phase 5 jobs (see docs/PHASE5.md). Mark [x] only when the job is done and checked.
- [x] P5-1: Plan the roadmap landing page: confirm the three decisions (three only, component previews with fake data, keep #FEF9F5), fix the stage 1 link to /start, add these jobs. Docs only (Opus 5.5 medium)
- [x] P5-2: Landing content module (stages, feature lines, links) with word-for-word tests; dark hero with the four actions, italic serif word, account-deleted notice, footer (Sonnet 5.5 medium)
- [x] P5-3: Roadmap timeline: five stages under #roadmap with mono labels, titles, sentences, feature lines, links, preview slots; one column on phones (Sonnet 5.5 medium)
- [x] P5-4: Fake demo data module and App preview panels for stages 1-3 (Sonnet 5.5 medium)
- [x] P5-5: Inline SVG chart previews for stages 4-5 and the static hero panel; draw in once, no motion with reduced motion (Sonnet 5.5 medium)
- [x] P5-6: Honest-estimates card, lime block with black text, final call to action (Sonnet 5.5 low)
- [x] P5-7: 3D ribbon / macro-dial with three, dynamic import, static fallback; not in signed-in bundles; cut first if the phase grows (Opus 5.5 high)
- [x] P5-7b: Landing preview bars fill in: hero calorie and macro bars on load on desktop, stage 2 calories bar and phone hero bars on scroll; off with reduced motion (Opus 5.5 high)
- [x] P5-8: Phase 5 walkthrough, no third-party requests, contrast, tsc, lint, tests, build with the dev server stopped (Sonnet 5.5 medium)
- [x] P5-9: Interactive App previews: eaten tick (stage 2), Swap (stage 3), 7/30/90-day range (stage 4), carbs -/+ with the real 5% check (stage 5); glass cards with hover lift; fake data only, nothing saved (Opus 5.5 medium)
- [x] P5-10: Sticky landing nav (RvFit, See the roadmap, Log in, Get my starting estimate) and roadmap line that fills with scroll, active stage dot glows; off with reduced motion (Sonnet 5.5 medium)
- [x] P5-11: Landing charts replay each time they scroll into view (DrawIn re-arms off screen, hero bars included); instant reset, off with reduced motion (Opus 5.5 medium)
- [x] P5-12: Redesign stage 1, 3 and 4 preview cards: target toggle and ring, week strip and tap-to-log set dots, stacked weekly blocks; fake data only (Opus 5.5 medium)

# Audit improvement jobs (from the 7-part audit, approved 2026-10-07). Mark [x] only when the job is done and checked.
- [x] AU-1: P0 fixes: src/proxy.ts refreshes Supabase sessions; Preferences shows an error instead of a blank form when a read fails; progression uses only planned sets, small and loadable steps, rep and hold caps; floor explanation is honest when the floor removes the deficit (Opus 5.5)
- [x] AU-2: Auth forms: shared fields with autocomplete, Show/Hide password, pending buttons with no double submit, errors announced (role=alert), honest forgot-password text, expired-link pages from the callback and reset page, rate-limit and network messages, logout pending and failure state; signed-in users skip /login and /signup (Opus 5.5)
- [x] AU-3: Sign-up flow: draft save says nothing when there is nothing to save (no more "Draft not found" or repeated "Saved."), ignores unfinished drafts, shows "already had targets" once, hides raw database errors; sign-up says to open the link in this browser when targets are waiting (Opus 5.5)
- [x] AU-4: Results save action: guest sees "Save my targets (free account)" with what it unlocks; signed-in without targets sees "Save to my account"; signed-in with targets is sent to Profile; one-line macro explanations (Opus 5.5)
- [x] AU-5: Dashboard "Get set up" card (target, preferences, first meal, first weigh-in) built only from saved data; hides when all done or on "Hide these steps"; Preferences says "Not saved yet" until the first save; workout and trend empty states say what is needed (Opus 5.5)
- [x] AU-6: Exercise form cues under each exercise on Workouts and the log screen (Opus 5.5)
- [x] AU-7: Landing previews match the real app (see docs/PHASE5.md AU-7); stage links 2-5 say "Needs a free account" (Opus 5.5)
- [x] AU-8: Root error.tsx (Try again, Dashboard), not-found.tsx, and loading.tsx for signed-in pages (Opus 5.5)
- [x] AU-9: Design system in globals.css (docs/UI-REFRESH.md "Design system"): surface tiers, button, field, segmented, chip, choice and alert classes, one focus ring; hand-rolled styles in navs, forms, guest flow, delete section, preferences, planner chips and previews moved to them (Opus 5.5)
- [x] AU-10: Auth, password, error and guest pages share AuthFrame: sticky glass header with theme toggle and one floating card; footer stays at the bottom (Opus 5.5)
- [x] AU-11: No backdrop blur under 768px or with reduced transparency (landing went from 8 blurred elements on a phone to 0) (Opus 5.5)
- [x] AU-12: Light mode: card shadows and highlight, dark-green focus ring; page colour unchanged (Opus 5.5)
- [x] AU-13: Feedback after actions: "Workout saved/updated" on Workouts with a Progress link, "Meal saved" with View my meals and Dashboard, plan saved notice on Meals explaining the eaten tick, Preferences saved with "See your workout plan", weigh-in and errors use the shared alert styles (Opus 5.5)
- [x] AU-14: Phones and tablets get a Menu button (shows the current section) that opens every nav item plus Log out; closes on navigation and Escape; the desktop row is unchanged from 1024px (Opus 5.5)
- [x] AU-15: Refactor: requireUser() for pages and getActionUser() for actions (src/lib/supabase/auth.ts) replace 33 copied sign-in checks; Workouts, Food library, Edit meal and Preferences load independent queries in parallel; Dashboard computes eaten totals once; Vitest config uses import.meta.dirname (Opus 5.5)
- [x] AU-16: Input edge cases: inches must be 0 to under 12 and feet whole; calculator asks for whole-year ages (matches save rules); the 30-day weight change compares weekly averages instead of first vs last weigh-in (Opus 5.5)
- [x] AU-17 (P3-1): Target check-in on Profile (src/lib/check-in.ts, placeholder values in calculationConfig.check_in): after two weeks with 3+ weigh-ins, two weeks apart, both after the target was set, compares the weekly-average trend with the pace; on track, or a 100-200 kcal suggestion rounded to 50, never below the floor; "Use" only pre-fills the form, nothing saves until Save (Opus 5.5)
- [x] AU-18 (P3-2): Goal and pace shown on Dashboard (Today), Progress (with a check-in link) and Profile (current target) (Opus 5.5)
- [x] AU-19 (P3-3): Dashboard Workout card shows "Next up" (first plan day not logged this week, with "n of planned done") and links straight to its log form; says when the week's plan is done (Opus 5.5)
- [x] AU-20 (P3-4): "Log again today" on past meals copies the foods and grams to today under the first free label (Opus 5.5)
- [x] AU-21 (P3-5): Effort cue on the workout log form ("about 1-3 more good reps"; placeholder pending review) (Opus 5.5)
- [x] AU-25: Landing 3D ribbon also runs on phones and tablets in a lite mode (1x pixels, 240 segments, about 30 fps, camera pulled back via RIBBON_KEYFRAMES_NARROW); reduced motion, data saver and no WebGL 2 still keep the static ribbon (Opus 5.5)
- [x] AU-26: Stage 3 "Full body A" preview redesigned: plan summary tiles, numbered steps with movement tags, plan badges, accent Swap pill; the "Last time" and progression block and its demo data were removed (Opus 5.5)
- [x] AU-22: Auth pages redesigned: always dark (.landing) with the ribbon in its hero pose, a top bar with Back to home and no theme toggle, one frosted glass card with a mono pill label (src/components/auth-scene.tsx) (Opus 5.5)
- [x] AU-23: "Continue with Google" on log in and sign-up, shown only when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED is "true"; checks the Auth settings first and says when Google is not set up; cancelled sign-in lands on /login?error=oauth with a friendly message, expired email links keep their own message; supabase/config.toml has [auth.external.google] off by default with env() credentials; README has the setup steps (Opus 5.5)
- [x] AU-24: Confirm password on sign-up and reset password: "Passwords don't match." under the field while typing (aria-invalid, aria-describedby) and checked on submit (src/lib/auth-validation.ts, tested) (Opus 5.5)
- [x] AU-27: Softer palette with no pure black: page #161A18, card #222624, field #1B1F1D, text on lime #141A0F, tinted shadows, light-theme ink #1B1F1D (Opus 5.5)
- [x] AU-28: Every .card is frosted glass like the landing PreviewFrame, on phones too (12px blur there); only reduced transparency makes cards solid (Opus 5.5)
- [x] AU-29: One ribbon in the root layout behind every page: landing journey, auth hero pose, calm brighter glow on app pages (ribbonRoute, calmIndex, CALM_SOFT, tested) (Opus 5.5)

# Ops and hardening jobs (from the 6-part audit: security, shipping, speed, traffic, survival, landing; 2026-10-09). Mark [x] only when the job is done and checked.
- [x] AU-30: Server error logging: logError (src/lib/log.ts, tested; code and message only, no user data) in every server-action and callback error branch; src/instrumentation.ts logs uncaught request errors with the digest and warns at startup about missing Supabase env vars (Opus 5.5)
- [x] AU-31: src/app/global-error.tsx for root layout failures; /api/health (no-store, Supabase Auth check, 200/503, no details) for a free uptime monitor (Opus 5.5)
- [x] AU-32: Security headers in next.config.ts (frame-ancestors none, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, HSTS; no X-Powered-By); secure_password_change on in supabase/config.toml (Opus 5.5)
- [x] AU-33: Migration 20261009010000_audit_hardening: anon grants revoked on Phase 1 tables, sanity CHECKs on body_logs (not valid, so old rows are untouched), save_meal capped at 30 items; matching cap in validateMeal (calculationConfig.meal_limits.max_items, tested) (Opus 5.5)
- [x] AU-34: CI workflow (.github/workflows/ci.yml: typecheck, lint, test, build; never deploys), typecheck script, Node engines, .env.example (allowed by .gitignore), README checks and deploy pointer, docs/RUNBOOK.md (setup, deploy, migrations, monitoring, backups, restore, rollback) (Opus 5.5)
- [x] AU-35: Ribbon pauses after 5 s without scrolling (WCAG 2.2.2) and stops drawing until the next scroll, resize or page change (ribbonShouldDraw, tested); landing page is static again (account-deleted notice read in the browser); meal builder reads in parallel; guest draft cleared on logout (Opus 5.5)
- [x] AU-36: Landing polish: one Lucide stroke icon per stage (inline, ISC notice in src/components/stage-icon.tsx), phones show each stage's preview right after its title, tabular numbers in previews, hero card above the fold on phones (Opus 5.5)
- [x] AU-37: At the user's request the ribbon animates continuously again (the 5-second pause from AU-35 is removed; reduced motion, data saver and no WebGL 2 still get the static ribbon). Lime banner carousel between the hero and the roadmap (src/components/fitness-carousel.tsx): one fitness line per stage with its icon, auto-rotates every 5 s, Pause/Play button, dots, swipe on phones, pauses on hover or focus, starts paused with reduced motion, hidden slides inert, content in CAROUSEL_SLIDES (tested) (Opus 5.5)
- [x] AU-38: Replaced the AU-37 text carousel (removed) at the user's request. The lime RvFit band before the final call to action is now an endless strip of 10 custom line-art fitness illustrations (gym, food, running; src/components/fitness-illustrations.tsx, no third-party art) gliding behind the RvFit wordmark (src/components/rvfit-marquee.tsx, CSS-only animation, hover and a Pause button stop it, still with reduced motion). Honest estimates is now an Estimate → Track → Adjust card (src/components/estimate-steps.tsx: calorie dial, drawing trend chart, adjust chip) with the plan line kept word for word; step text in ESTIMATE_STEPS (tested) (Opus 5.5)
- [x] AU-39: Replaced the AU-38 RvFit illustration strip (removed with its line-art icons) with a 3D feature showcase (src/components/feature-showcase.tsx, src/components/showcase-scene.ts, content in src/lib/showcase.ts, tested): five slides (targets ring, macro plate, dumbbell + kettlebell, smart scale with readout, adjust sliders), modelled in three.js with one studio light setup, chrome, rubber, ceramic and lime materials, reflections and a contact shadow, on a dark graphite stage. Auto-advances every 6 s; by the user's choice hover does not pause it and there is no pause control (WCAG 2.2.2 risk noted); progress bars jump to a slide; swipe on phones; reduced motion shows a still grid of the five features with no 3D. The scene loads only near the screen and draws only while on screen (4 KB gzipped plus the shared three chunk) (Opus 5.5)
- [x] AU-40: The roadmap, the 3D carousel and the Estimate → Track → Adjust card told the same five-stage story three times, so they are merged into one scroll story (src/components/roadmap-story.tsx; roadmap-timeline.tsx, feature-showcase.tsx and estimate-steps.tsx removed). Each stage keeps its plan wording, link and interactive App preview. Desktop: the 3D object is pinned on the right and swaps as each stage reaches the middle of the screen (the timeline dot's rule); phones: it sits at the top of the active stage. One offscreen WebGL renderer copies each frame into the active canvas. Nothing runs on a timer, so the WCAG 2.2.2 concern for this section is gone. Reduced motion or no WebGL: stage icons, no 3D. The honest-estimates line closes the roadmap as a short note with a small dial (Opus 5.5)
- [x] AU-41: At the user's request the roadmap is back to the AU-36 timeline (src/components/roadmap-timeline.tsx, no 3D; roadmap-story.tsx removed). Only the part below it changed: honest estimates is now a three-step scroll story, Estimate → Track → Adjust (src/components/estimate-story.tsx, steps in ESTIMATE_STEPS in src/lib/showcase.ts, tested), with the 3D ring, scale and sliders pinned on the right on desktop and at the top of the active step on phones, ending with the plan's honest line word for word, then the final call to action. No timer; reduced motion or no WebGL shows icons (Opus 5.5)
- [x] AU-42: Honest estimates no longer repeats the roadmap: heading "How RvFit treats your numbers." and three rules (Starting point, Trend over today, You decide) with facts from the demo data and calculationConfig.check_in (src/lib/showcase.ts, tested, including a check that no step reuses a stage title). Same 3D objects and plan line; roadmap untouched (Opus 5.5)
- [x] AU-43: Every meal starts unticked and has the "I ate this" checkbox on Meals and the Dashboard, not only planner meals, so New meal and Log again no longer fill the day on their own (migration 20261010010000_meals_start_unticked sets the eaten default to false; existing meals keep their tick). Unticked meals show Planned or Not eaten (Opus 5.5)
- [x] AU-44: Light mode follows the dark style: sage-tinted neutrals (page #F3F5F1, muted #525A55, track #E2E7DF, field #F7F8F5), white frosted glass with a faint hairline, tinted shadows, and the ribbon glow shown with multiply blending (.ribbon-canvas). Accent text, focus and Fit Green rules unchanged; landing and auth pages stay dark (Opus 5.5)
- [x] AU-45: Theme button is now a Day/Night pill switch (role=switch): Day shows a white sun knob on the right of the sage track, Night a lime moon knob on the left of the dark card; the knob slides (no motion with reduced motion) (Opus 5.5)
