# Handoff: after the Activity jobs (AC-1 to AC-6)

Written 2026-10-28 at the end of the autopilot run. Replaces `AU-78.md` and `autopilot.md`. Use the job-handoff skill when the next job is done.

## Status

- All six Activity jobs are done and committed locally on `main`. **Nothing is pushed.** Pushing to `main` redeploys https://rv-fit.vercel.app, so ask first.
- The migration `20261028010000_ac1_activity.sql` is applied to **local** Supabase only. The hosted database (rvfit-prod) doesn't have it, so the app would break there until the owner applies it. Push the code and the migration together, and only with the user's OK.
- Commits: plan `59ec634`, AC-1 `6728708`, AC-2 `c5f6465`, AC-3 `7571bf2`, AC-4 `c232103`, AC-5 `b3b03e5`, AC-6 (see `git log`).
- Final checks: lint, typecheck, 866 unit tests, 194 database tests, 70 e2e runs (build included), `npm audit --omit=dev` 0 vulnerabilities.

## What exists now

- Today: Burned today (estimate) card (resting grows through the day, plus workouts, steps and other activity, and an end-of-day estimate); Steps and sleep card; Other activity card.
- Workouts: optional Duration (minutes).
- Progress: Steps and Sleep 7-day averages (3 days minimum) and the last 7 dates.
- Profile: the delete confirmation and the privacy page now list steps, sleep and other activity.
- Review sheet section 6 (rows 6.1–6.17): every new placeholder, decisions empty.

## Decisions already made by the user

- 2026-10-28: add steps, sleep and calories burned ("should be automatic"); burned calories are calculated from what is logged, for information only, never changing the target; resting burn grows through the day with an end-of-day line (Claude's recommendation, accepted with "continue with the plan").
- 2026-10-28: "Other activity" is back (replaces the 2026-10-25 "no Other activity").
- Earlier decisions in the old AU-78 handoff still hold: no smoothed trend line, no waist or best-set trends; keep the roadmap and the detailed ribbon.

## Still open

- Whether CI run #10 (for `adc0217`) passed. It was never answered.
- Qualified review of `docs/REVIEW-SHEET.md`, now including section 6. Never fill in its Decision column.
- Domain and email provider (`docs/RUNBOOK.md`, "Email provider").
- Seen during checks, existing behaviour: a browser still holding the session of a user deleted **outside** the app (admin delete) keeps rendering signed-in pages until the token expires, and Log out fails for it. Pages check the token with `getClaims` on purpose (`src/lib/supabase/auth.ts`). The app's own account deletion signs out first, so real users are not affected.

## Files and facts that matter

- Math: `src/lib/activity/burn.ts`; inputs: `src/lib/activity/inputs.ts`; Today mapping: `src/lib/activity/today.ts`; Progress: `src/lib/activity/progress.ts`; placeholders: `calculationConfig.activity` and `progress.activity_*`.
- The Supabase CLI is linked to **rvfit-prod**. Use local commands only. Never run `db push` or `config push` without the user's OK.
- e2e needs Docker Desktop and local Supabase running. Text files: keep each file's line endings. No Python. `gh` is not installed.

## Model and effort

Sonnet 5.5 medium for a push-and-verify chat. Opus 5.5 high if the next job is applying the migration to the hosted database.

## First steps for the new chat

1. Read `CLAUDE.md`, this file, `docs/TASKS.md`, and `docs/ACTIVITY.md`.
2. Ask what's next: push the Activity work (with the hosted migration), or something else.

## Do not

- Do not push, deploy, or touch the hosted database without asking.
- Do not change health values, `docs/REVIEW-SHEET.md` decisions or saved targets.
