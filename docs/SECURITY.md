# Security Architecture & Threat Model

Discover Togo uses defence in depth: each layer assumes the one before it can fail. This document maps realistic attacks to the controls that stop them and names the code or config file behind each control.

## 1. Trust boundaries

```
 [Mobile app]   [Admin web]          untrusted clients (attacker-controlled)
      │  HTTPS + Firebase ID token (JWT, 1h)
      ▼
 [CDN / LB / WAF]  TLS termination, DDoS absorption
      ▼
 [Discover Togo API]  ← every security decision is made here
      │                   ▲ verifies JWT signatures against Google public keys
      ▼                   │
 [MongoDB Atlas]     [Firebase Auth]  [Cloud Storage (rules)]
```

The clients are never trusted. The admin UI hides buttons for convenience, but every permission is re-checked on the server.

## 2. Request pipeline (`backend/src/app.ts`)

| # | Layer | Stops |
|---|---|---|
| 1 | Request ID (UUID; forged inbound IDs replaced) | Log injection, makes incidents traceable |
| 2 | Structured logs with `Authorization` / `Cookie` / emails redacted | Credential and PII leakage through logs |
| 3 | HTTPS enforcement (`REQUIRE_HTTPS`, on by default in prod) + HSTS preload | Downgrade, session sniffing |
| 4 | Helmet: `default-src 'none'`, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, `no-referrer`, CORP | Clickjacking, MIME sniffing, content injection |
| 5 | CORS allow-list, `credentials: false` | Cross-origin data theft. No cookies means no CSRF surface |
| 6 | Global rate limit (per IP) | Floods, scraping |
| 7 | JSON-only writes (415) | Form-based CSRF, parser confusion |
| 8 | 20 KB body cap, strict JSON parser | Memory exhaustion |
| 9 | Input firewall (`security/guards.ts`): rejects `$`-keys, dotted keys, `__proto__`/`constructor`/`prototype`, depth > 8, > 200 keys | NoSQL operator injection, prototype pollution, CPU-exhaustion JSON |
| 10 | Flat query parser (`query parser: simple`) | `?a[$ne]=` object injection |
| 11 | Per-route: authenticate → account status → RBAC → per-user rate limit → strict zod schema | See §3–§5 |
| 12 | Central error handler | Stack traces and driver errors are never returned |

## 3. Authentication (`middleware/auth.ts`, `security/identity.ts`)

- **Identity provider:** Firebase Auth (email/password + Google). The API never sees or stores passwords.
- **Token verification:** `verifyIdToken` checks signature, expiry, audience (project) and issuer. A structural JWT pre-check and a 4 KB length cap run before any crypto work.
- **Revocation:** admin routes call `verifyIdToken(token, checkRevoked=true)`. When a user is suspended or demoted, the API calls `revokeRefreshTokens`, so privileged sessions die immediately.
- **Account status:** suspended accounts get `403 ACCOUNT_SUSPENDED` on every authenticated route.
- **Admin bootstrap:** only emails in `ADMIN_EMAILS` that are verified by Firebase are promoted, and only on first sign-in. Roles are never taken from client input.
- **Dev mode:** `AUTH_MODE=dev` accepts `dev:<uid>:<role>` tokens for local work. The server refuses to boot with it when `NODE_ENV=production` (`config/env.ts`). The same check blocks the in-memory store, disabled rate limits and wildcard or `http://` CORS origins.

## 4. Authorization

| Role | Can |
|---|---|
| `user` | Read the catalogue, manage own profile, favorites and reviews |
| `editor` | + create/edit listings, moderate reviews, view stats |
| `admin` | + delete listings, manage users and roles, read the audit log |

- Roles are hierarchical (`requireRole`) and stored in our database, which is the source of truth. They are mirrored to Firebase custom claims for Storage rules.
- Admins cannot change their own role or status. This prevents lock-out and makes privilege abuse visible in the audit log.
- **Ownership:** favorites, recent views, profile and account deletion all work on `req.user` only. No user id is ever accepted from the client for these routes, which rules out IDOR.
- **Mass assignment:** strict zod schemas reject unknown keys. Mongoose runs in `strict: 'throw'`. Server-managed fields (`rating`, `reviewCount`, `views`, `role`, `email`) are not part of any client schema.
- **Data minimisation:** presenters (`services/present.ts`) list allowed output fields explicitly. `firebaseUid`, push tokens, moderation metadata and reviewer emails never reach public responses.

## 5. Input validation & content safety

- Every query, path parameter and body is checked by a strict zod schema (`services/schemas.ts`). IDs must match `^[a-f0-9]{24}$` before any database call.
- Search text is accent-folded and regex-escaped, so `(a+)+$` is matched literally. This prevents ReDoS and regex injection.
- Mongoose `sanitizeFilter` is a second barrier against operator injection.
- **User-generated content:** reviews have HTML tags, control characters and bidi/zero-width characters stripped. They are limited to 10–1000 characters and at most 2 links, require a verified email, are limited to one per user per listing and to 10 per hour, and enter a **moderation queue** before they become public.
- **URLs:** image URLs must use `https://` on an allow-listed host (`IMAGE_HOSTS`). Contact and booking URLs must use `https://`, so `javascript:` and `data:` URLs are rejected. Clients also open only `http(s)`, `tel:` and `mailto:` links.
- **Geodata sanity:** coordinates must fall inside Togo's bounding box, which catches swapped latitude and longitude. A city must belong to its region.

## 6. Abuse & availability

- Tiered rate limits (see `docs/API.md`), keyed by user when known. Anonymous limits are generous because Togolese mobile carriers use CGNAT (many users share one IP).
- View counts are de-duplicated per viewer and listing for 1 hour, so popularity can't be inflated.
- Pagination caps: 50 per page, 500 map pins, 20 per search group. Favorites are capped at 500 per user.
- Server timeouts: 20 s for headers, 30 s per request (stops slowloris). Graceful shutdown on SIGTERM.
- Production should run behind Cloud Armor or Cloudflare (WAF + DDoS). For more than one API instance, swap the in-memory rate-limit store for Redis (`security/rateLimit.ts`).

## 7. Data protection & privacy

- TLS everywhere. MongoDB Atlas encrypts data at rest. Use IP access lists or private endpoints and a least-privilege DB user (readWrite on one database).
- **Right to erasure:** `DELETE /me` removes the profile, favorites and reviews (and fixes the affected ratings) and deletes the Firebase account. App Store and Play Store both require this.
- Audit log of every admin mutation (actor, action, target, IP, time). It expires automatically after 2 years.
- **Mobile:** tokens are managed by the Firebase SDK. Sensitive values go to `expo-secure-store` (Keychain/Keystore), never AsyncStorage. The offline cache holds only public listing data, and user-specific caches are wiped on sign-out. Cleartext HTTP is disabled in production builds.
- **Admin web:** strict CSP and `X-Frame-Options: DENY` via `admin/firebase.json`. No `dangerouslySetInnerHTML`. Tokens are held in memory only. Inactive sessions are signed out automatically after 30 minutes.

## 8. Infrastructure & supply chain

- Cloud Storage rules (`firebase/storage.rules`): public read for listing photos, staff-only uploads (email verified + role claim, ≤5 MB, image MIME types), per-user avatar paths, deny everything else.
- Firestore rules: deny all (unused).
- API container (`backend/Dockerfile`): multi-stage build, runs as the non-root `node` user, dev dependencies removed, includes a healthcheck.
- **CI** (`.github/workflows/ci.yml`): typecheck, the 51-test security and API suite, `npm audit` (fails on high), gitleaks secret scanning. Dependabot sends weekly update PRs.
- **Secrets** live in environment variables or Secret Manager only. `.gitignore` blocks service-account JSON files, keystores, `google-services.json` and `.env*`.
- **Firebase console hardening checklist:** see `firebase/README.md` (App Check, API key restrictions, email enumeration protection, authorized domains).

## 9. Security test coverage (`backend/tests/security.test.ts`)

Covered: production config refusal, security headers, HSTS and HTTPS enforcement, CORS allow-list, no leaks in error bodies, forged request IDs, operator/dotted/prototype-pollution bodies, deep nesting, query bracket injection, HTTP parameter pollution, unknown parameters, regex metacharacters, content-type/size/malformed JSON, id validation, token validation, role hierarchy, mass assignment, suspension lock-out, self-privilege changes, image/URL allow-listing, review link spam and the per-user review rate limit.

## 10. Recommended next steps before launch

1. Run an external penetration test and set up a `security.txt` / responsible-disclosure contact.
2. Enforce Firebase App Check on the API too: verify the `X-Firebase-AppCheck` header with `firebase-admin/app-check`.
3. Use a shared Redis store for rate limits once you run more than one instance.
4. Add certificate pinning on mobile if the threat model includes hostile networks or device MITM.
5. Send alerts on spikes of 401/403/429 and on new admin promotions (audit log → Cloud Logging metrics).
