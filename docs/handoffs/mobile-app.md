# Handoff: mobile app (Expo, Android and iOS)

Written 2026-11-02 at the end of the first autopilot run; updated the same day at the end of the second run, which finished the old "Left to do" list (docs/TASKS.md MO-1 to MO-7). The user asked for a complete mobile app and said to keep working without asking for approval on routine decisions (autopilot). Use the job-handoff skill when the next job is done.

## Status

- The app is in `mobile/`. It is committed locally as `dab9ec4` and has not been pushed. Nothing is deployed, and the hosted databases were not touched.
- Every web feature has a mobile screen: welcome, guest setup (age gate, calculator, manual target, results), log in, sign-up, forgot and reset password, the email-link callback, Today, Food (day cards, meal builder, edit meal, planner, Browse foods), Train (plan, swaps, log and edit workout), Progress, Me (Profile and targets, check-in, account, appearance, log out, delete), Preferences, Week, Privacy, Terms and Glossary.
- Tested by hand on the Android emulator against local Supabase:
  - the calculator matches the web numbers
  - sign-up, then the email link (`rvfit://auth/callback?code=…`), saved the guest draft to the account
  - an expired link goes to Log in with the link message
  - log in, log out, and password reset by email link
  - manual target saved from Results while signed in
  - saving Preferences, then logging a workout
  - a meal with grams, and ticking it as eaten
  - planner preview, then save, which goes back to Food with the notice
  - a weigh-in and the weight chart
  - dark and light theme
  - account deletion (the user was gone from `auth.users` afterwards)
- Second run (see docs/TASKS.md MO-2 to MO-7 and docs/MOBILE.md): S256 PKCE fix for the dev warning toast, every remaining screen tested, offline and check-in fixes, workout-log labels, a release APK that runs without Metro, the `mobile` CI job, docs/MOBILE.md and the README section.
- Checks that passed at the end of the second run: mobile typecheck, lint and 34 tests; web typecheck, lint, 877 unit tests, `npm run build` and 72 e2e runs.
- Third run (2026-11-03, docs/TASKS.md MO-11): Google mark and divider, the 3D ribbon (expo-gl; `mobile/src/features/ribbon-scene.ts`, `components/ribbon-background.tsx`, `components/ribbon-screen.tsx`), and Welcome as the web landing page (`features/landing-*.tsx`). A staging APK (`mobile/dist/rvfit-staging.apk`, arm64-v8a and x86_64) was built with the staging public values and Google turned on.

## Architecture (decided; see also `mobile/README.md`)

- Expo SDK 57 (React Native 0.86), expo-router, TypeScript. Needs Node 22: use `C:\Users\arvince\AppData\Local\nvm\v22.23.4` on PATH for mobile commands. The system Node is 20.19 and the web app still uses it.
- Shared logic: `@/lib/*` maps to `../src/lib/*` (`mobile/tsconfig.json`, `mobile/metro.config.js` watchFolders). The app's own code is `~/*` → `mobile/src/*`. The web loaders take the server client type, so the mobile client is passed as `sharedClient` (typed `any`) in `mobile/src/lib/supabase.ts`.
- `mobile/src/services/*` are the mobile versions of the web server actions: the same validation, RPCs and messages, called with the user's token. Row-level security is the security boundary, as before.
- Account deletion needs the admin key, so the app calls the new web endpoint `DELETE /api/account` (`src/app/api/account/route.ts`) with `Authorization: Bearer <token>`. The endpoint checks the token with `getUser`. **It only works against staging or production after the web app is deployed. That needs the user's OK.**
- The session is stored in `expo-secure-store`, chunked (`mobile/src/lib/secure-storage.ts`). The guest draft, workout drafts and theme use the `localStorage` API from `expo-sqlite/localStorage`. `crypto.randomUUID` comes from expo-crypto (`mobile/src/lib/polyfills.ts`).
- React Query handles caching. `refreshAll()` after each save is the counterpart of the web's `refresh()`. Today's date comes from the phone's time zone (`mobile/src/lib/clock.ts`).
- Mobile adaptations, all logged here:
  - dates use a one-day stepper
  - pickers use chips
  - deletes ask with the phone's own dialog
  - the planner is two steps (pick, then preview)
  - the welcome screen and auth screens are always dark with the 3D ribbon, like the web; Welcome copies the web landing page
  - Privacy has a "Stored on your device" section written for the app (draft text: needs the same review as the web one)
- Local `supabase/config.toml` now allows `rvfit://**` and `http://localhost:8081/**`. Hosted projects need `rvfit://**` added by the user in the dashboard.

## Dev environment facts

- Emulator `Medium_Phone_API_36.1`. Run `adb reverse tcp:8081 tcp:8081`, `adb reverse tcp:54321 tcp:54321` and `adb reverse tcp:3000 tcp:3000`.
- The emulator could not stream the bundle over `10.0.2.2` (chunk errors). The app's dev settings are pointed at `localhost:8081`; the pref file is `shared_prefs/app.rvfit.mobile_preferences.xml`.
- Metro's file watcher stopped seeing edits once mid-run. If the phone shows old behaviour, restart Metro with `--clear`. Check what Metro serves with `curl "http://localhost:8081/src/app/<route>.bundle?platform=android&dev=true&lazy=true&modulesOnly=true&runModule=false"`.
- Native build: run `npx expo run:android --no-bundler` with `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"` and `CI=1`. The first build takes about 35 minutes; incremental builds take about 5.
- Console logs do not reach Metro or logcat (RN 0.86), and the DevTools socket refused scripted connections. To see warnings, run a tiny local HTTP server that logs request URLs (for example on port 54399), `adb reverse` that port, and temporarily wrap `console.warn`/`console.error` to `fetch` it. Remove that afterwards.
- Start Metro without `CI=1` (`npx expo start --port 8081 --clear`): `CI=1` turns off file watching. Stop Metro before `expo prebuild`, or its watcher locks `android/` (EBUSY).
- The emulator now has the **release** APK installed. `android/` was regenerated by prebuild, so the next dev build (`npx expo run:android`) starts from scratch (about 35 minutes).
- Driving the emulator: dump the UI with `adb shell uiautomator dump`, then `adb shell input tap/text`. Set `MSYS_NO_PATHCONV=1` for device paths in Git Bash. Chrome on the emulator shows a first-run terms screen: do not accept it. Follow `verify` links with `curl -D -` and open the `Location` with `adb shell am start -d`.
- Local test users: `mobile-dev@rvfit.test` (password kept in the session scratchpad; recreate it with the admin API if needed) and leftover `aapp-…@rvfit.test` and `user-…@rvfit.test` sign-ups. The one deleted in the test is gone. All are local only.

## Left to do

The old list is finished. What is left needs the user (docs/TASKS.md MO-8 to MO-10, and below). Possible app-side follow-ups, none started:

- Test Google sign-in in the app once Google is set up on a Supabase project.
- Check TalkBack on a few screens (labels were checked only in the accessibility tree).
- Build only one ABI for local release checks (`-PreactNativeArchitectures=x86_64`) to cut the 39-minute build.

## Needs the user

- Deploying the web app (for `/api/account`) and adding `rvfit://**` to the Redirect URLs of rvfit-staging and rvfit-prod.
- iOS: a Mac, or an Expo account for EAS Build, and an Apple Developer membership. iOS has never been built or run.
- Store accounts (Google Play $25, Apple $99/year) and a release signing key.

## Do not

- Do not push, deploy, or touch the hosted databases without asking. The Supabase CLI is linked to rvfit-prod: use local commands only.
- Do not edit `CLAUDE.md`, `docs/PLAN.md`, or the decisions in `docs/REVIEW-SHEET.md`.
- Keep each file's line endings (`supabase/config.toml` and `vitest.config.mts` are CRLF).
