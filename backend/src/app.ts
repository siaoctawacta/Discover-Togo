import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Env } from './config/env.js';
import { TtlSet } from './lib/util.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import type { Repository } from './repo/types.js';
import { adminRoutes } from './routes/admin.js';
import type { Ctx } from './routes/context.js';
import { meRoutes } from './routes/me.js';
import { publicRoutes } from './routes/public.js';
import { rejectMaliciousInput, requestId, requireHttps, requireJson } from './security/guards.js';
import type { IdentityProvider } from './security/identity.js';
import { createLimiters } from './security/rateLimit.js';
import { makeSchemas } from './services/schemas.js';
import { logger } from './lib/logger.js';

export interface AppDeps {
  env: Env;
  repo: Repository;
  identity: IdentityProvider;
}

/**
 * Request pipeline (order matters — each layer narrows what reaches the next):
 *
 *  1. request id           correlation for logs & error responses
 *  2. structured logging   with Authorization/Cookie redacted
 *  3. HTTPS enforcement    (behind TLS-terminating proxy)
 *  4. security headers     helmet: HSTS, nosniff, frame-deny, strict CSP, no referrer
 *  5. CORS allow-list      browsers only; native apps send no Origin
 *  6. global rate limit    per IP, before any expensive work
 *  7. content-type gate    JSON only for writes (415 otherwise)
 *  8. body parser          20 KB cap, strict JSON
 *  9. input firewall       rejects $operators, dotted keys, __proto__, deep nesting
 * 10. routes               per-route: authn → account status → RBAC → per-user limits → zod schemas
 * 11. error handler        uniform envelope, no internals leaked
 */
export function createApp({ env, repo, identity }: AppDeps): Express {
  const app = express();
  const ctx: Ctx = {
    env,
    repo,
    identity,
    limiters: createLimiters(env),
    schemas: makeSchemas(env),
    viewDedup: new TtlSet(60 * 60_000),
  };

  app.disable('x-powered-by');
  app.disable('etag'); // avoid weak-etag timing/caching quirks on private data; CDN handles caching
  app.set('trust proxy', env.TRUST_PROXY);
  app.set('query parser', 'simple'); // flat query strings only: no ?a[b]=c object injection

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).id,
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url, ip: req.remoteAddress }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(requireHttps(env.REQUIRE_HTTPS));
  app.use(
    helmet({
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      hsts: env.isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || env.CORS_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept-Language', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      credentials: false, // bearer tokens only, no cookies → no CSRF surface
      maxAge: 600,
    }),
  );
  app.use('/api', ctx.limiters.global);
  app.use(requireJson);
  app.use(express.json({ limit: '20kb', strict: true, type: 'application/json' }));
  app.use(rejectMaliciousInput);

  const v1 = express.Router();
  v1.use(publicRoutes(ctx));
  v1.use(meRoutes(ctx));
  v1.use('/admin', adminRoutes(ctx));
  app.use('/api/v1', v1);

  app.use(notFoundHandler);
  app.use(errorHandler(env.isProd));
  return app;
}
