# RvFit runbook

How to deploy, watch, back up and recover RvFit. Planned hosting: Vercel (app) and Supabase (Auth and Postgres). Nothing here runs until you choose to deploy (see CLAUDE.md). Launch still needs the review gate in `docs/PLAN.md` "Launch review and deployment".

## 1. One-time setup (needs your accounts)

1. **Code backup.** Create a private GitHub repo and push `main`. CI (`.github/workflows/ci.yml`) then runs typecheck, lint, tests and build on every push and pull request.
2. **Two Supabase projects.** One for staging and one for production, in the same region as the Vercel functions (set the Vercel project's function region to match).
3. **Vercel project.** Import the repo and set the variables from `.env.example` in each environment:
   - Production → production Supabase.
   - Preview → **staging** Supabase. Never put the production keys in Preview.
   - `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never give it a `NEXT_PUBLIC_` name.
   - Vercel Hobby is for non-commercial use only. Any public or commercial launch needs Vercel Pro.
4. **Hosted Auth settings** (Supabase dashboard → Authentication), for each project:
   - Site URL is the real domain. Redirect URLs are exactly `https://<domain>/auth/callback` (and the preview domain for staging).
   - **Custom SMTP** (for example Resend or Postmark). Supabase's built-in email cannot reach real users, so sign-up confirmation and password reset fail without it. Then raise the email rate limit.
   - Turn on **Secure password change**, leaked-password protection, and minimum password length 8 (same as `supabase/config.toml`).
   - Optional: CAPTCHA on sign-up and password reset if bots appear.
   - Google sign-in: see README. Add the hosted callback URL to the Google OAuth client.
5. **Uptime monitor.** Point a free monitor (for example UptimeRobot or Better Stack) at `https://<domain>/api/health` every 5 minutes, with email alerts. 200 means the app and Supabase Auth answer; 503 means Supabase is down or slow.

## 2. Deploying a change

1. Open a pull request. CI must pass. Vercel builds a preview against staging.
2. **Schema change?** Migrations go first and must only add things (new tables, columns, functions or constraints). Code that needs them deploys after.
   ```bash
   npx supabase link --project-ref <staging-ref>
   npx supabase db push --dry-run
   npx supabase db push
   ```
   Test the preview. Then **back up production** (section 4), link the production project and run the same two commands.
3. Merge to `main`. Vercel deploys production.
4. Smoke test: sign up, confirm the email, log in, save a meal, log a workout, add a weigh-in, then log out. Check `/api/health`.

**First launch only:** after migrations, load the food catalog into each project. The import script only runs against local Supabase on purpose. Export the reviewed local catalog tables (`foods`, `food_measures`) with `npx supabase db dump --local --data-only --table public.foods --table public.food_measures` and apply that SQL once per project.

## 3. When something breaks

**Detect:** an uptime alert, a user report, or errors in Vercel → Project → Logs.

**Diagnose:**
- Server errors are one JSON line each (`src/lib/log.ts`, `src/instrumentation.ts`). Search Vercel logs for:
  - `"scope"`, for example `meals.save`, `dashboard.load`, `auth.exchangeCode`;
  - the `digest` a user sees as "Error code" on the error page.
- Database and Auth errors also show in Supabase → Logs.
- The logs hold only the error code, message and path: no emails, tokens or user input.

**Recover:**
- **Bad deploy:** Vercel → Deployments → the last good one → Promote to Production (instant rollback).
- **Bad migration:** do not edit an applied migration. Write a new migration that fixes it forward. Roll back the app first if the new code depends on it.
- **Supabase outage:** nothing to do in the app; `/api/health` stays 503 until it recovers. Check status.supabase.com.
- **Lost or damaged data:** restore from backup (section 4) as a last resort, then re-apply any newer migrations.
- **Emails not arriving:** check the SMTP provider dashboard and Supabase Auth rate limits.

## 4. Backups and restore

- **Supabase Free has no automatic backups** and pauses after a week without activity. The uptime monitor's requests reach Auth but may not count as database activity, so use **Supabase Pro** (daily backups kept 7 days, no pausing) for any real launch.
- **Before every production migration, and weekly on Free**, take a dump and keep it off the laptop (a private cloud folder):
  ```bash
  npx supabase db dump --linked -f backup-schema.sql
  npx supabase db dump --linked --data-only -f backup-data.sql
  ```
  These files contain user data. Store them privately and delete old ones.
- **Restore:** on Pro, use Dashboard → Database → Backups. From a dump, apply `backup-schema.sql` then `backup-data.sql` to a fresh project with `psql`, point the app at it, and re-apply newer migrations.

## 5. Single points of failure and what covers them

| Part | If it fails | Cover |
|---|---|---|
| Laptop (only copy of code) | Everything lost | GitHub remote (step 1) |
| Supabase project | Sign-in and data down | Supabase uptime; Pro backups; `/api/health` alert |
| Auth email (SMTP) | No sign-ups or resets | Custom SMTP with its own dashboard |
| Vercel | Site down | Vercel uptime; instant rollback for bad deploys |
