import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from '../lib/errors.js';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 8;
const MAX_KEYS = 200;

/**
 * Rejects payloads that could be used for NoSQL operator injection
 * (`{"$gt": ""}`, `"a.b"` dotted paths) or prototype pollution, and bounds
 * nesting depth / key count to cap CPU spent walking hostile JSON.
 * We reject rather than silently strip so attacks are visible in logs.
 */
export function assertSafeInput(value: unknown, where: string): void {
  let keys = 0;
  const walk = (v: unknown, depth: number): void => {
    if (depth > MAX_DEPTH) throw new AppError('VALIDATION_ERROR', `${where} is nested too deeply`);
    if (Array.isArray(v)) return v.forEach((x) => walk(x, depth + 1));
    if (v && typeof v === 'object') {
      for (const k of Object.keys(v)) {
        if (++keys > MAX_KEYS) throw new AppError('VALIDATION_ERROR', `${where} has too many fields`);
        if (k.startsWith('$') || k.includes('.') || FORBIDDEN_KEYS.has(k))
          throw new AppError('VALIDATION_ERROR', `${where} contains a forbidden key`);
        walk((v as Record<string, unknown>)[k], depth + 1);
      }
    }
  };
  walk(value, 0);
}

export const rejectMaliciousInput: RequestHandler = (req, _res, next) => {
  assertSafeInput(req.query, 'Query');
  assertSafeInput(req.params, 'Params');
  if (req.body !== undefined) assertSafeInput(req.body, 'Body');
  next();
};

/** Write requests must be JSON. Blocks form-encoded CSRF-style posts outright. */
export const requireJson: RequestHandler = (req, _res, next) => {
  const hasBody = Number(req.headers['content-length'] ?? 0) > 0 || req.headers['transfer-encoding'] !== undefined;
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && hasBody && !req.is('application/json'))
    return next(new AppError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json'));
  next();
};

/** Behind a TLS-terminating proxy, refuse requests that arrived over plain HTTP. */
export const requireHttps =
  (enabled: boolean): RequestHandler =>
  (req, _res, next) => {
    if (enabled && !req.secure && req.path !== '/api/v1/health')
      return next(new AppError('HTTPS_REQUIRED', 'HTTPS is required'));
    next();
  };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Correlation id: accept a well-formed inbound one (from our gateway), else mint one. */
export function requestId(req: Request, res: Response, next: NextFunction) {
  const inbound = req.headers['x-request-id'];
  const id = typeof inbound === 'string' && UUID_RE.test(inbound) ? inbound : randomUUID();
  (req as Request & { id: string }).id = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/** API responses carry user-specific data: never let shared caches store them by default. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};

/** Public catalogue reads may be cached briefly by CDNs/clients (anonymous only). */
export const publicCache =
  (seconds: number): RequestHandler =>
  (req, res, next) => {
    if (!req.headers.authorization) res.setHeader('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);
    res.setHeader('Vary', 'Authorization, Accept-Language');
    next();
  };
