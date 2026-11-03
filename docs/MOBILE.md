# RvFit mobile app (Android and iOS)

The phone app lives in `mobile/`. It is an Expo (React Native) app that talks to the same Supabase
project as the website and reuses the website's own logic. Setup, commands and builds are in
[`mobile/README.md`](../mobile/README.md). This page records how it is built, the decisions behind it,
what matches the website, and what is still unverified.

Status on 2026-11-02: every web feature has a screen, tested by hand on the Android emulator against
local Supabase. Nothing is pushed, deployed or published to a store. iOS has never been built or run.

## Architecture

- **Expo SDK 57** (React Native 0.86, Hermes), **expo-router** (file-based routes in `mobile/src/app`),
  TypeScript. Needs Node 22.13 or newer; the web app still runs on the system Node.
- **Shared logic.** `@/lib/*` points at the web app's `src/lib/*` (`mobile/tsconfig.json`, and
  `watchFolders` in `mobile/metro.config.js`). Calculations, validation, data loaders, labels and
  messages come from there, so numbers and wording match the website. The app's own code is `~/*`
  (`mobile/src/*`). The shared loaders take the web server's Supabase client type, so the app passes its
  client as `sharedClient` (`mobile/src/lib/supabase.ts`).
- **Saves.** `mobile/src/services/*` are the app's versions of the web server actions: the same
  validation, the same database functions (RPCs) and the same messages, called with the signed-in
  user's token. Row-level security is the security boundary, as on the website.
- **Account deletion** needs the service-role key, which must never be in the app. The app calls the web
  endpoint `DELETE /api/account` (`src/app/api/account/route.ts`) with `Authorization: Bearer <token>`;
  the endpoint checks the token with `getUser` and deletes that user only.
- **Data on screen.** React Query caches each screen's data. After a save, `refreshAll()` marks
  everything stale, the counterpart of the web's `refresh()`. Today's date comes from the phone's time
  zone (`mobile/src/lib/clock.ts`).
- **Storage on the phone.** The Supabase session is in `expo-secure-store` (Android Keystore / iOS
  Keychain), split into chunks because the store refuses values over about 2 KB
  (`mobile/src/lib/secure-storage.ts`). The guest draft, workout drafts and the theme use the
  `localStorage` API from `expo-sqlite`.
- **Crypto.** Hermes has no Web Crypto. `mobile/src/lib/polyfills.ts` provides `randomUUID`,
  `getRandomValues` and `subtle.digest` from expo-crypto.

## Decisions

| Decision | Why |
|---|---|
| Expo with Continuous Native Generation (`android/` and `ios/` generated, not committed) | One codebase for both phones; native folders are rebuilt from `app.json`, so nothing is edited by hand. |
| Reuse `src/lib` instead of copying it | One source of truth for health numbers and rules that are still waiting for the qualified review. |
| Services call Supabase directly, not the website's server actions | Server actions are not a public API. RLS already limits every query to the user's own rows. |
| Account deletion through `/api/account` | The admin key stays on the server. |
| Email links use PKCE with S256 and return to `rvfit://auth/callback` | Only the phone that asked can use the link. `crypto.subtle.digest` was added because supabase-js otherwise fell back to the weaker `plain` method (and showed a dev warning). |
| Portrait only (`app.json`) | The screens are designed for a phone held upright. |
| Dates use a one-day stepper; pickers use chips | Simpler than native date and select pickers, and the same on Android and iOS. |
| Deletes ask with the phone's own Yes/No dialog | Familiar on each platform; the web shows inline Yes/No buttons. |
| The meal planner is two steps (pick, then preview) | The web's side-by-side layout does not fit a phone. |
| The welcome and log-in screens have the web's 3D light ribbon (expo-gl), and are always dark like the web's landing and auth pages | The user asked for the web look on the phone (2026-11-03). It is the web's phone ("lite") scene: the same path, strands, shaders, keyframes and glide, drawn with plain GL (three is used only for the curve and camera maths). Welcome moves one stop per stage card as you scroll; the auth screens hold the hero pose. It draws every frame while the camera glides and about 30 fps once settled, pauses when its screen is hidden or the app is in the background, and keeps a static ribbon with reduce motion on or if GL fails. Cards are 90% opaque instead of the web's blur, so grey text stays readable over the lines. |
| The welcome screen is the web landing page, section for section | The user asked for the same page as the web (2026-11-03). Sticky bar, hero with the Today preview, the five-stage roadmap (line that fills as you scroll, glowing current dot, stage icons) with every App preview and its small interaction, Before you start with the honest-estimates quote, the final call to action and the footer. Words and demo numbers come from the web's own files (`landing-content`, `landing-faq`, `demo-data`). The roadmap line and dots follow a native-driven scroll value, so they move with the finger; charts and bars draw in as they scroll into view and appear without moving under reduce motion. Stage links other than stage 1 go to Log in, as the web's links do for a signed-out visitor. |
| Privacy has a "Stored on your device" section | The app keeps a few things on the phone. The text is a draft and needs the same review as the web privacy page. |
| Offline: loads are tried even when the phone says it is offline, and are not retried until it is back online; PostgREST's own read retries are off | Otherwise a screen with nothing cached stayed on its spinner for about a minute instead of showing "You are offline" with Try again. Screens with cached data keep showing it under an offline banner, and reload by themselves on reconnect. |
| React Native warnings and `logError` go to the console only | No crash or analytics service, as on the website. |

## Web → app parity

| Web route | App screen | Notes |
|---|---|---|
| `/` (landing) | `welcome` | Same sections, previews and roadmap; 3D ribbon that follows the scroll. |
| `/start`, `/calculate`, `/manual`, `/results` | `start`, `calculate`, `manual`, `results` | Same age gate, calculator and guest draft. |
| `/login`, `/signup` | `login`, `signup` | Ribbon in its hero pose. Google sign-in (the "G" mark and the "or" divider, as on the web) sits behind `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED`, like the web flag. |
| `/forgot-password`, `/reset-password` | `forgot-password`, `reset-password` | Links open the app. Ribbon in its hero pose. |
| `/auth/callback` | `auth/callback` | Deep link `rvfit://auth/callback?code=…`; an expired link goes to Log in. |
| `/dashboard` (Today) | Today tab | Setup steps, eaten today, meals, workout, activity cards, check-in. |
| `/week` | `week` | |
| `/meals` | Food tab | Today, Plan and History; Copy yesterday; Log again today. |
| `/meals/new`, `/meals/[id]` | `meal/new`, `meal/[id]` | |
| `/meals/plan` | `meal/plan` | Two steps. |
| `/foods` | `foods` | Search, role and raw/cooked filters, Show more. |
| `/workouts` | Train tab | Plan with Swap and Reset to default, recent workouts with Edit and Delete. |
| `/workouts/log/new`, `/workouts/log/[id]` | `workout/new`, `workout/[id]` | Reps and Weight labels shown once, above the first set. |
| `/progress` | Progress tab | Weigh-ins, chart, calories strip, check-in, steps, sleep, workouts per week. |
| `/profile`, `/account` | Me tab | Profile and targets, check-in, account, appearance, log out, delete account. |
| `/preferences` | `preferences` | |
| `/privacy`, `/terms`, `/glossary` | `privacy`, `terms`, `glossary` | |
| `DELETE /api/account` | used by Me → Delete account | New endpoint for the app. |
| `/api/health` | — | Server only. |

## Security notes

- Only public values are in the app: the Supabase URL, the anon key and the website address
  (`EXPO_PUBLIC_*`). Anyone with the app can read them, the same as the website's `NEXT_PUBLIC_*`.
  The service-role key is never in the app.
- Every read and write is limited by row-level security; the services repeat the website's validation
  before saving.
- The session (access and refresh tokens) is in the phone's secure storage. Guest and workout drafts
  are in the app's private storage, which is not encrypted; on a rooted phone they could be read. They
  hold the same data the website keeps in the browser's localStorage.
- Another app could register the `rvfit://` scheme on Android. PKCE means an intercepted link is useless
  without the verifier that only this install has.
- Release builds do not allow plain `http`. Hosted Supabase and the website use `https`.
- `/api/account` accepts only a valid bearer token and deletes only that token's user. Its unit tests
  are in the web test suite.

## Costs

| Item | Cost |
|---|---|
| Google Play developer account | $25 once |
| Apple Developer Program (needed for iPhone installs, TestFlight and the App Store) | $99 a year |
| EAS Build (Expo's cloud builds; needed for iOS without a Mac) | Free plan with a limited number of builds a month; paid plans for more |
| Supabase and Vercel | Unchanged: the app uses the same projects as the website |

## Verified

On the Android emulator (Pixel-size, API 36) against local Supabase, by hand:

- Welcome, guest setup (age gate, calculator, manual target, results), sign-up with the email link,
  log in, log out, password reset by email link, expired link.
- Today, Week, Preferences, Train (Swap, Reset to default, log, edit), Food (new meal, edit meal, tick
  as eaten, planner, Copy yesterday, Log again today, History), Browse foods (search, filters, Show
  more), Progress (weigh-in, chart, check-in suggestion and "Use … kcal"), Me, dark and light theme,
  account deletion.
- Email links use S256 PKCE (checked in `auth.flow_state`), and no warnings show in the dev build.
- Offline: banner, cached screens stay, saves show their error, an uncached screen shows "You are
  offline" with Try again within a few seconds, and screens reload on reconnect.
- Small screen (360 × 640 dp): Today, Food and the workout log fit. Rotation stays portrait.
- Checks: `npm run typecheck`, `npm run lint`, `npm test` in `mobile/` (also in CI as the `mobile` job).
- Release APK: `npx expo prebuild --platform android`, then `./gradlew assembleRelease` (39 minutes on
  this PC; a 120 MB universal APK signed with the debug key). Installed on the emulator with Metro
  stopped, it opened signed in, a save reached the database, and a cold start took about 3 seconds.
  Because local Supabase is plain `http`, this local test used a temporary release manifest that allowed
  `http`; it was deleted afterwards and must never be in a store build.

## Not verified

- **iOS**: never built or run. Needs a Mac with Xcode, or EAS Build with an Expo account, and an Apple
  Developer membership to install on an iPhone.
- **Hosted Supabase**: the app has only talked to local Supabase. Staging and production need
  `rvfit://**` in Authentication → URL Configuration → Redirect URLs, and account deletion needs the web
  app (with `/api/account`) deployed first.
- **Google sign-in** in the app (Google is turned off on local Supabase).
- **A real phone**, other Android versions, and screen readers (labels were checked in the
  accessibility tree, not with TalkBack).
- **The `mobile` CI job** has not run on GitHub, because nothing is pushed.
- **Store release**: no upload key, store listing, privacy form or review yet.
