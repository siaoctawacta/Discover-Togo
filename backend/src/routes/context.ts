import type { Request } from 'express';
import type { Env } from '../config/env.js';
import type { Lang } from '../domain/types.js';
import type { Limiters } from '../security/rateLimit.js';
import type { IdentityProvider } from '../security/identity.js';
import type { Repository } from '../repo/types.js';
import type { Schemas } from '../services/schemas.js';
import { TtlSet } from '../lib/util.js';

export interface Ctx {
  env: Env;
  repo: Repository;
  identity: IdentityProvider;
  limiters: Limiters;
  schemas: Schemas;
  /** De-duplicates view counting per viewer+listing for an hour (anti-inflation). */
  viewDedup: TtlSet;
}

export function langOf(req: Request, explicit?: Lang): Lang {
  if (explicit) return explicit;
  const al = req.headers['accept-language'];
  return typeof al === 'string' && /^fr\b/i.test(al.trim()) ? 'fr' : 'en';
}

export const clientIp = (req: Request) => req.ip ?? 'unknown';
