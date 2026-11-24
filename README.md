This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Mobile app (Android and iOS)

The phone app is in [`mobile/`](mobile/README.md): an Expo (React Native) app that uses the same Supabase project and reuses the logic in `src/lib`. It has its own `package.json` and needs Node 22. Setup and commands: [`mobile/README.md`](mobile/README.md). Architecture, decisions, the web-to-app parity table and what is still unverified (iOS, hosted Supabase): [`docs/MOBILE.md`](docs/MOBILE.md).

The app deletes accounts through this website's `DELETE /api/account` endpoint, so that endpoint must be deployed before the app can delete accounts on a hosted project.

## Google sign-in (optional)

The log in and sign-up pages use [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview) in popup mode. Google owns the sign-in screen; RvFit then sends the returned ID token and its original nonce to Supabase, which creates the normal browser session. The Google script is loaded only by these two pages. If that script cannot load, the old Supabase redirect flow remains available as a clearly labelled fallback.

### Manual setup

1. **Google Cloud:** create or use an OAuth client ID of type **Web application**. Add the Vercel production URL and `http://localhost:<port>` (normally `http://localhost:3000`) as **Authorized JavaScript origins**. The origins must exactly match the app URLs, including scheme and port.
2. **Vercel:** add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` with that client ID, keep `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`, and redeploy. Do not put the Google client secret in Vercel as a public variable.
3. **Supabase:** enable the Google provider and confirm its Google client ID is the same value. Keep **Skip nonce checks** off. This repository's local `supabase/config.toml` currently has its equivalent set on; change that configuration manually before relying on local nonce validation.
4. **Local Supabase (if used):** put the provider credentials in `supabase/.env` (ignored by git, never commit it):

   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-secret
   ```

   Then enable the provider in the local Supabase configuration and restart the local stack. Add both `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id` to `.env.local`, then restart `npm run dev`.

With the feature flag on but no client ID, the page says Google sign-in is not set up yet. If the Google script fails to load (for example, a network or extension block), the fallback button uses Supabase's redirect flow and can therefore show the Supabase project URL.

**Fallback only:** to retain the redirect fallback, keep `https://<project-ref>.supabase.co/auth/v1/callback` registered as an authorized redirect URI in the same Google OAuth client for each Supabase environment.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:db
npm run test:e2e
```

`npm run test:e2e` builds the app and runs the Playwright smoke test in `e2e/` against local Supabase, at phone and desktop sizes. It opens every public and signed-in page and runs axe (WCAG 2.1 A and AA; any violation fails), logs in, saves a weigh-in and logs out. It also signs up a new account and opens the confirmation link from Mailpit (local Supabase's mail catcher, `MAILPIT_URL`, default `http://127.0.0.1:54324`). It creates throwaway users with the admin key from `.env.local`, refuses to run unless Supabase is on 127.0.0.1, and deletes the users afterwards. Install the browser once with `npx playwright install chromium`. After changing `supabase/config.toml` (for example the allowed redirect URLs), restart local Supabase with `npx supabase stop` then `npx supabase start`; stop keeps your data. CI runs it in the `e2e` job on a fresh local stack.

`npm run test:db` runs the database tests in `supabase/tests/database` (pgTAP: grants, row-level security and the save functions) against local Supabase, so start it first with `npx supabase start`. Each test file runs in one transaction and is rolled back.

CI runs the same checks on every push and pull request (`.github/workflows/ci.yml`); the database tests run in their own job on a fresh database with the migrations and `supabase/seed.sql`. Copy `.env.example` to `.env.local` for local settings.

## Deploying

Do not deploy until the launch review in `docs/PLAN.md` is done. Setup, deploys, monitoring, backups and rollback are in [docs/RUNBOOK.md](docs/RUNBOOK.md).
