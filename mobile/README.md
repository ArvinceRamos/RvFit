# RvFit mobile app (Android and iOS)

The phone app for RvFit, built with Expo (React Native). It talks to the same Supabase project as the
website and reuses the website's own logic from `../src/lib`, so numbers, rules and messages match.
Architecture and decisions: [`../docs/MOBILE.md`](../docs/MOBILE.md).

## Requirements

- **Node 22** (Expo SDK 57 needs Node 22.13 or newer). With nvm-windows: use `C:\Users\<you>\AppData\Local\nvm\v22.x\node.exe`, or `nvm use 22`.
- **Android:** Android Studio (SDK platform 36, an emulator or a phone with USB debugging) and a JDK 17–21. Android Studio's own JDK works: set `JAVA_HOME` to `C:\Program Files\Android\Android Studio\jbr`.
- **iOS:** a Mac with Xcode, or a free Expo account for cloud builds (see "iOS" below).
- The website's local setup for local data: Docker Desktop and local Supabase (`npx supabase start` in the repo root).

## First-time setup

```bash
cd mobile
npm ci
cp .env.example .env.local
```

Fill in `.env.local` (see `.env.example`). For local development the values are the same as the web
app's `NEXT_PUBLIC_` ones: `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, the local anon key, and
`EXPO_PUBLIC_WEB_URL=http://127.0.0.1:3000`. Only public values go here: everything in the app can be
read by anyone who has it. Never put the service-role key in the app.

## Run it

```bash
npm run android      # builds the native app (first time takes 20–40 minutes), installs it, starts Metro
npm start            # Metro only, once the app is installed
npm run web          # a browser preview at http://localhost:8081 (handy for quick checks)
```

On the Android emulator, forward the local ports so `127.0.0.1` on the emulator reaches your computer:

```bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:54321 tcp:54321
adb reverse tcp:3000 tcp:3000
```

Run the website too (`npm run dev` in the repo root) if you want to test account deletion, which goes
through its `/api/account` endpoint.

If the emulator shows "Expected leading [0-9a-fA-F] character" while loading, it cannot stream the
bundle over `10.0.2.2`. Open the dev menu (Ctrl+M) → Settings → "Debug server host" and enter
`localhost:8081` (after the `adb reverse` above).

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

`npm test` runs the Vitest unit tests in `src/**/*.test.ts` (services, secure storage, guest draft,
routes) with Supabase mocked. The shared logic in `../src/lib` is tested by the web app's own tests.
CI runs all three in the `mobile` job.

## Supabase settings (each project)

Email links (sign-up confirmation, password reset) and Google sign-in return to the app at
`rvfit://auth/callback`. In the Supabase dashboard → Authentication → URL Configuration → Redirect URLs,
add:

- `rvfit://auth/callback` (installed builds)
- `exp://**` only if you test with Expo Go

Local Supabase already allows `rvfit://auth/callback` (`supabase/config.toml`). Restart local Supabase
after changing that file.

Links work only on the phone that asked for them (PKCE): the app keeps the one-time verifier in its
secure storage.

## Build for release

The project uses Continuous Native Generation: `android/` and `ios/` are generated from `app.json` and
are not committed. Never edit them by hand.

### Android

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease     # APK in android/app/build/outputs/apk/release/
cd android && ./gradlew bundleRelease       # AAB for Google Play
```

The generated project signs release builds with the debug key, which is fine for testing on your own
phone but not for Google Play. For the store, either use EAS Build (it creates and keeps the upload
key for you) or create your own keystore and set it up in `android/app/build.gradle` via a config
plugin. Google Play needs a one-time $25 developer account.

### iOS

iOS apps can only be built on macOS. Without a Mac, use EAS Build in the cloud:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
```

The free EAS plan includes a limited number of builds each month. Installing on an iPhone, TestFlight
and the App Store all need an Apple Developer Program membership ($99 a year).

For a quick look without any build, Expo Go on an iPhone can open the project from `npm start` if the
Expo Go version on the store supports SDK 57.

## Environment per build

| Build | Supabase | Web URL |
|---|---|---|
| Local development | local (`127.0.0.1:54321`) | `http://127.0.0.1:3000` |
| Staging / testers | rvfit-staging | the staging (preview) web address |
| Production | rvfit-prod | the production web address |

Set the `EXPO_PUBLIC_` values for each build (an `.env.local`, or EAS environment variables). A test
build must never point at production.

A phone APK for staging, without touching your local `.env.local` (Git Bash, in `mobile/android`):

```bash
rm -f app/build/generated/assets/react/release/index.android.bundle   # Gradle does not see env changes
EXPO_NO_DOTENV=1 \
EXPO_PUBLIC_SUPABASE_URL=https://<staging-ref>.supabase.co \
EXPO_PUBLIC_SUPABASE_ANON_KEY=<staging anon or sb_publishable key> \
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

`EXPO_PUBLIC_WEB_URL` is left out until the website with `/api/account` is deployed, so Delete account
says it is not set up instead of failing. Check the bundle has the right address before sharing it:
`grep -ac <staging-ref> app/build/generated/assets/react/release/index.android.bundle`.
