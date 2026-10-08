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

## Google sign-in (optional, local)

The log in and sign-up pages can show **Continue with Google**. It stays hidden until you turn it on.

1. In Google Cloud Console, create an OAuth client ID (type: Web application).
2. Add this authorized redirect URI: `http://127.0.0.1:54321/auth/v1/callback`.
3. Put the client ID and secret in `supabase/.env` (ignored by git, never commit it):

   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=your-client-id
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=your-secret
   ```

4. In `supabase/config.toml`, set `enabled = true` under `[auth.external.google]`, then run `npx supabase stop` and `npx supabase start`.
5. Add `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` to `.env.local` and restart `npm run dev`.

With the flag on but Google not set up, the button says Google sign-in is not set up yet.

**Hosted projects (Vercel + Supabase):**

1. In the same Google OAuth client, add `https://<project-ref>.supabase.co/auth/v1/callback` for each Supabase project (staging and production).
2. In each Supabase project, open Authentication → Sign In / Providers → Google, turn it on, and paste the client ID and secret.
3. Only then add `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in Vercel (Production, and Preview for staging) and redeploy.

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
```

CI runs the same four on every push and pull request (`.github/workflows/ci.yml`). Copy `.env.example` to `.env.local` for local settings.

## Deploying

Do not deploy until the launch review in `docs/PLAN.md` is done. Setup, deploys, monitoring, backups and rollback are in [docs/RUNBOOK.md](docs/RUNBOOK.md).
