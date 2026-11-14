# Discover Togo — mobile app

React Native (Expo SDK 58, TypeScript strict, expo-router) client for the Discover Togo API (`../docs/API.md`).

## Quick start

```bash
cd mobile
npm install
cp .env.example .env          # fill in what you have; everything is optional for a demo
npx expo start                # i / a / w for iOS, Android, web
```

Run the backend in demo mode in another terminal (`cd ../backend && npm install && npm run dev`, in-memory seed data,
`AUTH_MODE=dev`). For the web build add your web origin to the backend's `CORS_ORIGINS`.
To sign in without Firebase during development set `EXPO_PUBLIC_DEV_AUTH=1`: the login screen shows a
**Dev login** button that sends `Authorization: Bearer dev:tester:user` (only in `__DEV__` builds).

Maps use `react-native-maps` with `PROVIDER_GOOGLE` and need a development build (`npx expo run:ios|android`
or EAS) — Expo Go does not include Google Maps. On web, the map tab and the detail mini-map fall back to a list / card.

| Script | What |
|---|---|
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm run export:web` | static web export to `dist/` |

## Environment

All configuration is via `EXPO_PUBLIC_*` variables (see `.env.example`). They are inlined into the JS bundle,
so they are **not secrets** — protect them by restriction instead (see Security).

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_API_URL` | API base (default `http://localhost:4000/api/v1`). **Must be `https://` in production builds** — the client refuses to send any request to a plain-http URL when `__DEV__` is false. |
| `EXPO_PUBLIC_FIREBASE_*` | Firebase web config (Auth only). Without it the app still runs; auth screens show "not configured". |
| `EXPO_PUBLIC_GOOGLE_{WEB,IOS,ANDROID}_CLIENT_ID` | Google sign-in (expo-auth-session → ID token → `signInWithCredential`). |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps SDK key, injected by `app.config.ts` (iOS + Android). |
| `EXPO_PUBLIC_DEV_AUTH=1` | Dev-only "Dev login" button (ignored in production builds). |
| `EXPO_PUBLIC_ADS_ENABLED=1` | Render `AdSlot` placeholders. |

## Structure

```
app/                         expo-router routes
  _layout.tsx                providers, fonts, root stack
  index.tsx                  → /onboarding (first launch) or /(tabs)
  onboarding.tsx             full-bleed intro + swipe-up "Go"
  (tabs)/                    Home · Explore · Map · Saved · Profile (custom tab bar)
  listing/[kind]/[id].tsx    shared detail screen (place / restaurant / hotel)
  list/[kind].tsx            category / list screens with filter sheet
  reviews/[id].tsx           all reviews;  reviews/write/[id].tsx  write a review (auth)
  auth/                      login, signup, forgot
  search.tsx  settings.tsx
src/
  api/        typed fetch client (timeout, ApiError, auth header, lang) + one module per resource
  auth/       AuthProvider (Firebase + dev token), token provider for the API client
  hooks/      React Query hooks (home, listings, search, map, reviews, me, favorites…)
  components/ ui/ primitives · listing/ cards & rows · map/ (native + .web fallbacks) · home/ · onboarding/
  features/   screen-level building blocks (explore filters, detail sections, auth)
  store/      zustand: prefs (theme, language, onboarding, recent searches), offline store, location
  theme/      tokens (light/dark), ThemeProvider + useTheme()
  i18n/       i18next setup, languages.ts, locales/{en,fr}.json
  lib/        validators, safeOpenUrl, directions, distance, XOF formatting, queryClient, firebase, push
  config/     env
```

### Offline mode
* React Query cache is persisted to AsyncStorage (7 days) — **only public roots** (`home`, `meta`, `listings`,
  `listing`, `map`, `reviews`). Everything under the `user` root (me, favorites, recent, personalized
  recommendations) is never persisted and is removed on sign-out.
* "Save for offline" on a detail page keeps the full public listing JSON in a dedicated store (max 200 items),
  which the detail screen uses as placeholder data when there is no network. The Saved tab lists these items
  and shows an offline banner (NetInfo → React Query `onlineManager`).

### Adding a language (Ewe, Kabiyè…)
Add `src/i18n/locales/<code>.json` with the same keys as `en.json`, register it in `src/i18n/index.ts`
(`resources`) and `src/i18n/languages.ts` (`LANGUAGES`, with `apiLang` = closest language the API serves).

## Security notes
* **Tokens never touch AsyncStorage.** On iOS/Android Firebase's persistence is given a SecureStore-backed adapter
  (`src/lib/secureAuthPersistenceStorage.ts`, Keychain / Keystore, chunked). On web, Firebase uses session storage.
  The dev-login uid is kept in SecureStore (memory only on web). AsyncStorage holds only UI prefs and public listing data.
* A fresh ID token (`getIdToken()`) is attached to each request. Sign-out clears user caches.
* Route params / deep links are validated (`/^[a-f0-9]{24}$/` or slug `/^[a-z0-9-]{1,80}$/`, enum values) before any API call.
* External links go through `safeOpenUrl` (http(s), tel, mailto only). API text is rendered as plain `<Text>` only.
* Client-side validation mirrors the backend (review 10–1000 chars, rating 1–5, display name ≤ 60).
* iOS ATS: `NSAllowsArbitraryLoads=false`. Android: `usesCleartextTraffic` is set by `app.config.ts` via
  `expo-build-properties` — `true` only for development builds (local http API) and **`false` when
  `APP_ENV=production`** (set it in your EAS production profile).
* **Restrict your keys in Google Cloud console**: the Maps SDK key and the Firebase API key must be restricted to the
  app's bundle id `app.discovertogo.mobile` (iOS) and package name + release **SHA-1** (Android), and to the needed APIs.
  Enable **Firebase App Check** (App Attest / Play Integrity) for Auth and the backend.
* Push tokens (`expo-notifications`) are registered best-effort after sign-in on physical devices only, and need an
  EAS `projectId` (`extra.eas.projectId`).

## Local web QA build
`EXPO_WEB_SYNC_ROUTES=1 EXPO_PUBLIC_DEV_AUTH=1 npx expo export --platform web --dev` produces a debuggable static
build that talks to a local http backend (a normal production export refuses http). Screenshots in
`../docs/screenshots/` were taken this way with Playwright at 390×844.
