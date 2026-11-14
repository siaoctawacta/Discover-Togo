# Discover Togo — Admin dashboard

Web back-office for the Discover Togo API: manage places, restaurants and hotels (EN + FR), moderate reviews, manage users and read the audit log.

**Stack:** React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · react-hook-form + zod · Firebase Auth (JS SDK). Styling is a small hand-written design system (`src/styles/global.css`, CSS variables, light + dark).

## Features

| Area | What it does | Role |
|---|---|---|
| Login | Firebase email/password and Google popup. Optional dev login (`dev:<uid>:<role>`) for local API. After sign-in, `GET /me` must return `editor` or `admin` with status `active`; otherwise the user sees "Access denied" and is signed out. | – |
| Dashboard | `GET /admin/stats`: counts per kind, users, pending reviews, top viewed listings. | editor |
| Places / Restaurants / Hotels | One generic list + form, parameterised by kind. Search, status filter, pagination (state kept in the URL). Create/edit with EN/FR side by side, region → city (from `GET /meta`), lat/lng (Togo bounds), images editor (https + allow-listed hosts, reorder, first = cover), tags, featured, status, sponsorship end date, contact; per kind: category/opening hours/entry fee; cuisine/price level/menu editor; hotel type/stars/amenities/price range. | editor (delete: admin) |
| Reviews | Pending / approved / rejected tabs, approve/reject with optimistic update and rollback. | editor |
| Users ★ | Search, filter by role/status, change role, suspend/reactivate (disabled on your own row). | admin |
| Audit log ★ | Paginated table of administrative actions. | admin |

Client validation (`src/lib/listingForm.ts`) mirrors `backend/src/services/schemas.ts`; the API remains the source of truth and its `VALIDATION_ERROR` details are mapped back onto the form fields.

## Setup

```bash
cd admin
npm install
cp .env.example .env.local     # then edit
npm run dev                    # http://localhost:5173
```

Run the API locally in demo mode (in-memory seed data, dev tokens):

```bash
cd backend && npm install
AUTH_MODE=dev DATA_DRIVER=memory CORS_ORIGINS=http://localhost:5173 npm run dev   # http://localhost:4000
```

With `VITE_DEV_AUTH=1` in `.env.local`, the login page shows a **Dev login** box: pick a user id and `editor`/`admin`.

### Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | API base URL incl. `/api/v1` (default `http://localhost:4000/api/v1`). Its origin is written into the CSP `connect-src` at build time. |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` | Firebase web config (public identifiers). Without them only the dev login is available. |
| `VITE_DEV_AUTH` | `1` enables the dev login. **Ignored in `production` mode builds** (`vite build` default), so it can't ship by accident; the API also refuses dev tokens in production. |
| `VITE_IMAGE_HOSTS` | Optional comma-separated image host allow-list (defaults to the API's `IMAGE_HOSTS` default). Used for validation, previews and CSP `img-src`. |

### Scripts

| Script | |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b` (strict type check) + production build to `dist/` |
| `npm run typecheck` / `npm run lint` | Type check only / oxlint |
| `npm run preview` | Serve `dist/` locally (port 4173) |
| `npm run csp:print` | Print the CSP **header** for the given `VITE_*` env (to keep `firebase.json` in sync) |

## Deploy (Firebase Hosting)

```bash
npm ci
VITE_API_URL=https://api.discovertogo.app/api/v1 \
VITE_FIREBASE_API_KEY=… VITE_FIREBASE_AUTH_DOMAIN=discover-togo.firebaseapp.com \
VITE_FIREBASE_PROJECT_ID=discover-togo VITE_FIREBASE_APP_ID=… \
npm run build
firebase deploy --only hosting      # uses admin/firebase.json
```

`firebase.json` serves `dist/` as an SPA and sets security headers on every response: `Content-Security-Policy`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security` (2 years, preload), `Cross-Origin-Opener-Policy: same-origin-allow-popups` (required by the Google sign-in popup), `Cross-Origin-Resource-Policy`, `X-Robots-Tag: noindex`. Hashed assets are cached immutably; `index.html` is `no-cache`.

If your API origin, auth domain or image hosts differ from the defaults, regenerate the header value with `npm run csp:print` (same env vars as the build) and paste it into `firebase.json`. On another host (Netlify, Cloudflare, nginx…) send the same headers; the `<meta>` CSP alone can't express `frame-ancestors`, and a header is always preferable.

Also add the hosting domain to **Firebase Console → Authentication → Settings → Authorized domains** and to the API's `CORS_ORIGINS`.

## Security notes

- **No HTML injection:** all API data (names, descriptions, reviews, emails…) is rendered as React text. `dangerouslySetInnerHTML` is not used anywhere.
- **Tokens:** Firebase Auth is initialised with `inMemoryPersistence`, so ID/refresh tokens never touch `localStorage`/IndexedDB (a reload requires signing in again — intentional for a back-office). The dev token is stored in `sessionStorage` only when dev login is enabled.
- **Inactivity:** automatic sign-out after 30 minutes without input (wall-clock based, so it also fires after sleep/background throttling).
- **Roles:** routes and controls are gated client-side (`RequireAdmin`, hidden nav, disabled self-edit), but the API enforces every permission — the UI is convenience only.
- **Error handling:** `401` → sign out ("session expired"); `403` → "Access denied" toast; `429` → "Slow down" toast; queries never retry 4xx.
- **CSP:** production builds inject a strict `<meta http-equiv="Content-Security-Policy">` (no `unsafe-inline`/`unsafe-eval`; `connect-src` limited to self, the API origin and Google auth endpoints; `img-src` limited to the image allow-list). The dev server runs without it because React Fast Refresh needs an inline script. Real headers are set in `firebase.json`.
- **URLs:** image URLs must be `https://` on an allow-listed host before they are previewed; external links (website, booking) are rendered only for `https://` and open with `rel="noopener noreferrer"`. Images load with `referrerpolicy="no-referrer"`.
- **Requests:** `fetch` with `credentials: 'omit'` and `cache: 'no-store'`; query/path params are encoded; search input is length-limited.
- **Dependencies:** `npm audit` reports a `@grpc/grpc-js` advisory via `firebase` → `@firebase/firestore`. This app only imports `firebase/app` and `firebase/auth` (Firestore is not in the bundle), so the vulnerable code never ships.

## Project layout

```
admin/
├─ csp.config.ts            CSP builder (build meta tag + csp:print)
├─ firebase.json            Firebase Hosting config + security headers
├─ index.html               <!-- CSP --> placeholder replaced at build time
├─ scripts/print-csp.ts
└─ src/
   ├─ auth/                 AuthProvider (Firebase + dev login, /me check, 401 handling), useInactivity
   ├─ components/           Layout, RequireRole, Toast, TagInput, icons, ui primitives
   ├─ lib/                  api client, endpoints, types (API contract), listingForm (zod + mappers), url, theme
   ├─ pages/                Login, Dashboard, Listings, ListingForm, Reviews, Users, AuditLog
   └─ styles/global.css     design tokens + components
```
