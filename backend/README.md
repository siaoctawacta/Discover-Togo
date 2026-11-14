# Discover Togo API

Node.js 22 · Express 5 · TypeScript · MongoDB (Mongoose) · Firebase Auth · zod

## Quick start (no database or Firebase needed)

```bash
cd backend
npm install
cp .env.example .env     # defaults: in-memory store with Togo seed data + dev auth
npm run dev              # http://localhost:4000/api/v1
```

Try it:

```bash
curl "http://localhost:4000/api/v1/home?lang=fr"
curl "http://localhost:4000/api/v1/places?region=plateaux&category=nature"
curl -H "Authorization: Bearer dev:alice:user" http://localhost:4000/api/v1/me
curl -H "Authorization: Bearer dev:boss:admin" http://localhost:4000/api/v1/admin/stats
```

## Production configuration

```env
NODE_ENV=production
DATA_DRIVER=mongo
MONGODB_URI=mongodb+srv://...
AUTH_MODE=firebase
FIREBASE_PROJECT_ID=your-project
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-sa.json   # or workload identity
CORS_ORIGINS=https://admin.discovertogo.app
ADMIN_EMAILS=you@yourdomain.com
TRUST_PROXY=1
```

Seed MongoDB with the sample dataset (idempotent): `MONGODB_URI=... npm run seed`.

The server **refuses to start** when production is combined with dev auth, the memory store, disabled rate limiting, or wildcard/`http://` CORS origins.

Container: `docker build -t discover-togo-api backend/`. The image runs as a non-root user and includes a healthcheck.

## Scripts

| Script | |
|---|---|
| `npm run dev` | watch mode (tsx) |
| `npm test` | 51 API + security tests (vitest + supertest, in-memory) |
| `npm run typecheck` / `npm run build` | strict TypeScript |
| `npm run seed` | upsert sample data into MongoDB |
| `npm run audit:deps` | dependency vulnerability audit |

## Layout

```
src/
  app.ts              middleware pipeline (documented security layers)
  server.ts           boot, timeouts, graceful shutdown
  config/env.ts       zod-validated env, fail-closed production rules
  domain/             types, enums, regions/cities/labels catalogue
  repo/               Repository port + memory and Mongo adapters
  security/           identity (Firebase/dev), guards, rate limits
  middleware/         authn/RBAC, validation, error envelope
  services/           schemas, presenters, recommender, ratings
  routes/             public, me (+reviews), admin
  seed/               Togo sample data + Mongo seeder
tests/                api + security suites
```

See [`../docs/API.md`](../docs/API.md) for the contract, [`../docs/SECURITY.md`](../docs/SECURITY.md) for the threat model, and [`../docs/DATABASE.md`](../docs/DATABASE.md) for the schema.
