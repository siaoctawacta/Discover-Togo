import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

/**
 * Tiered rate limiting.
 *  - Key = authenticated user id when known, else client IP (IPv6 collapsed to /56
 *    so an attacker can't rotate through a /64). Togo mobile carriers use CGNAT,
 *    so anonymous IP limits are deliberately generous; per-user limits are strict.
 *  - The default store is in-memory (per instance). For horizontal scaling plug a
 *    shared store (e.g. `rate-limit-redis`) into `store` below.
 */
const keyOf = (req: Request) => {
  const uid = (req as Request & { user?: { id: string } }).user?.id;
  return uid ? `u:${uid}` : `ip:${ipKeyGenerator(req.ip ?? '0.0.0.0')}`;
};

function limiter(env: Env, name: string, windowMs: number, limit: number): RequestHandler {
  if (!env.RATE_LIMIT_ENABLED) return (_req, _res, next) => next();
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => `${name}:${keyOf(req)}`,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED', 'Too many requests, please slow down')),
  });
}

export const createLimiters = (env: Env) => ({
  /** Everything under /api — coarse flood protection per IP. */
  global: limiter(env, 'global', 15 * 60_000, 1500),
  /** Unauthenticated search is the most expensive public query. */
  search: limiter(env, 'search', 60_000, 60),
  /** Session bootstrap: limits token-stuffing attempts. */
  auth: limiter(env, 'auth', 15 * 60_000, 50),
  /** Authenticated writes (favorites, profile). */
  write: limiter(env, 'write', 15 * 60_000, 300),
  /** Review creation: anti-spam. */
  review: limiter(env, 'review', 60 * 60_000, 10),
  /** Back-office traffic. */
  admin: limiter(env, 'admin', 15 * 60_000, 2000),
});
export type Limiters = ReturnType<typeof createLimiters>;
