# RvFit runbook

How to deploy, watch, back up and recover RvFit. Planned hosting: Vercel (app) and Supabase (Auth and Postgres). Nothing here runs until you choose to deploy (see CLAUDE.md). Launch still needs the review gate in `docs/PLAN.md` "Launch review and deployment".

## 1. One-time setup (needs your accounts)

1. **Code backup.** Create a private GitHub repo and push `main`. CI (`.github/workflows/ci.yml`) then runs typecheck, lint, tests and build on every push and pull request.
2. **Two Supabase projects.** One for staging and one for production, in the same region as the Vercel functions. `vercel.json` pins the functions to `hnd1` (Tokyo, next to the Supabase project); change both together.
3. **Vercel project.** Import the repo and set the variables from `.env.example` in each environment:
   - Production → production Supabase.
   - Preview → **staging** Supabase. Never put the production keys in Preview.
   - `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never give it a `NEXT_PUBLIC_` name.
   - Vercel Hobby is for non-commercial use only. Any public or commercial launch needs Vercel Pro.
4. **Hosted Auth settings** (Supabase dashboard → Authentication), for each project:
   - Site URL is the real domain. Redirect URLs are exactly `https://<domain>/auth/callback` (and the preview domain for staging).
   - **Custom SMTP** (for example Resend or Postmark). Supabase's built-in email cannot reach real users, so sign-up confirmation and password reset fail without it. Then raise the email rate limit. Steps are in "Email provider" below.
   - Turn on **Secure password change**, leaked-password protection, and minimum password length 8 (same as `supabase/config.toml`).
   - Optional: CAPTCHA on sign-up and password reset if bots appear.
   - Google sign-in: see README. Add the hosted callback URL to the Google OAuth client.
   - **Email provider** (AU-69). Sign-up needs a confirmed email, so this blocks every new family member until it is done.
     1. **You need a domain you own** (for example `rvfit.app`). A `*.vercel.app` address cannot send email. The same domain can serve the site.
     2. Create an account with a transactional email provider. Resend is the simplest here: its free plan covers a family test (check the current daily and monthly limits on its pricing page). Postmark or Amazon SES work the same way.
     3. In the provider, add the domain and copy the DNS records it shows (SPF, DKIM, and usually a return-path or MX record) into your DNS host. Wait until the provider shows the domain as verified.
     4. Create an API key that can only send email. Keep it in the provider and Supabase only; never in this repo or `.env.local`.
     5. Supabase → Authentication → Emails → SMTP Settings → enable custom SMTP. Sender email `no-reply@<domain>`, sender name `RvFit`. For Resend: host `smtp.resend.com`, port `465`, username `resend`, password = the API key. Other providers list their own host, port and username.
     6. Supabase → Authentication → Rate Limits → raise "emails sent per hour" from the built-in default (for example to 30). Keep it low; it caps abuse too.
     7. On staging: sign up with a real address, confirm it from the email, log out, then use "Forgot password" and finish the reset. Check that the links open `https://<domain>/auth/callback`, not localhost, and look for the emails in the provider's log. Then repeat steps 5–6 on production.
     - Local Supabase never sends real email. Every email lands in Mailpit at http://127.0.0.1:54324. SMTP stays out of `supabase/config.toml` on purpose: the CLI is linked to production, and `supabase config push` would send local settings there.
5. **Uptime monitor.** Point a free monitor (for example UptimeRobot or Better Stack) at `https://<domain>/api/health` every 5 minutes, with email alerts. 200 means the app, Supabase Auth and the database answer; 503 means Supabase is down or slow. Each check runs a tiny database query (`keepalive()`, migration `20261029010000_ka1_keepalive`), so it also keeps a Free project from pausing. It answers GET and HEAD, so UptimeRobot's default HEAD check works. If the browser shows `{"status":"ok"}` but the monitor says down, set the monitor's method to GET.

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

**First launch only:** after migrations, load the food catalog into each project. The import script only runs against local Supabase on purpose. The reviewed catalog (`foods`, `food_measures`) is committed as `supabase/seed.sql`; apply it once per project (SQL editor or `psql`). It skips rows that already exist. After a catalog change, regenerate it from local Supabase with `docker exec supabase_db_rvfit pg_dump -U postgres -d postgres --data-only --no-owner --no-privileges --table=public.foods --table=public.food_measures --column-inserts --rows-per-insert=50 --on-conflict-do-nothing`, then drop the `--`, `SET`, `set_config` and `\restrict` lines and keep the file's header comment.

## 3. When something breaks

**Detect:** an uptime alert, a user report, or errors in Vercel → Project → Logs.

**Diagnose:**
- Server errors are one JSON line each (`src/lib/log.ts`, `src/instrumentation.ts`). Search Vercel logs for:
  - `"scope"`, for example `meals.save`, `dashboard.load`, `auth.exchangeCode`;
  - the `digest` a user sees as "Error code" on the error page.
- Database and Auth errors also show in Supabase → Logs.
- Error code `54000` ("Too many … rows") is a per-user limit (migration `20261025020000_per_user_limits`, placeholders: for example 100 meals or 50 weigh-ins in 24 hours). Real use should never reach one, so it points to a script or abuse.
- The logs hold only the error code, message and path: no emails, tokens or user input.

**Recover:**
- **Bad deploy:** Vercel → Deployments → the last good one → Promote to Production (instant rollback).
- **Bad migration:** do not edit an applied migration. Write a new migration that fixes it forward. Roll back the app first if the new code depends on it.
- **Supabase outage:** nothing to do in the app; `/api/health` stays 503 until it recovers. Check status.supabase.com.
- **Lost or damaged data:** restore from backup (section 4) as a last resort, then re-apply any newer migrations.
- **Emails not arriving:** check the SMTP provider dashboard and Supabase Auth rate limits.

## 4. Backups and restore

- **Supabase Free has no automatic backups** and pauses after a week without database activity. The uptime monitor's `/api/health` check runs a database query every 5 minutes to prevent that (KA-1); check the Postgres chart on the Supabase dashboard for small regular bars. Staging is not monitored and may pause; restore it from the dashboard when needed. A paused project looks like an outage: the project URL stops resolving. Restore it in the dashboard, and on Windows run `ipconfig /flushdns` if the address still fails locally. Still use **Supabase Pro** (daily backups kept 7 days) for any real launch.
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
