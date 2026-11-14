import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Env } from '../config/env.js';
import { DEFAULT_PREFERENCES, type Role, type UserRecord } from '../domain/types.js';
import { AppError, forbidden, unauthenticated } from '../lib/errors.js';
import type { Repository } from '../repo/types.js';
import type { IdentityProvider, VerifiedIdentity } from '../security/identity.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      user?: UserRecord;
      identity?: VerifiedIdentity;
    }
  }
}

const MAX_TOKEN_LEN = 4096;

function extractBearer(req: Request): string | undefined {
  const h = req.headers.authorization;
  if (!h) return undefined;
  if (h.length > MAX_TOKEN_LEN + 7) throw unauthenticated('Invalid token');
  const m = /^Bearer ([^\s]+)$/.exec(h);
  if (!m) throw unauthenticated('Malformed Authorization header');
  return m[1];
}

export interface AuthDeps {
  env: Env;
  repo: Repository;
  identity: IdentityProvider;
}

/** Find-or-provision the local profile for a verified Firebase identity. */
async function resolveUser({ env, repo, identity }: AuthDeps, id: VerifiedIdentity): Promise<UserRecord> {
  const existing = await repo.users.findByFirebaseUid(id.uid);
  if (existing) {
    const patch: Partial<UserRecord> = {};
    if (existing.email !== id.email) patch.email = id.email;
    if (existing.emailVerified !== id.emailVerified) patch.emailVerified = id.emailVerified;
    if (id.devRole && existing.role !== id.devRole) patch.role = id.devRole;
    return Object.keys(patch).length ? ((await repo.users.update(existing.id, patch)) ?? existing) : existing;
  }
  // Bootstrap admins only from a verified email on the allow-list — never from client input.
  const bootstrapAdmin = id.emailVerified && env.ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(id.email);
  const role: Role = id.devRole ?? (bootstrapAdmin ? 'admin' : 'user');
  const user = await repo.users.create({
    firebaseUid: id.uid,
    email: id.email,
    emailVerified: id.emailVerified,
    displayName: (id.name ?? id.email.split('@')[0] ?? 'Traveler').slice(0, 60),
    ...(id.picture ? { photoUrl: id.picture } : {}),
    role,
    status: 'active',
    preferences: { ...DEFAULT_PREFERENCES },
    favorites: [],
    recent: [],
    pushTokens: [],
  });
  if (role !== 'user') await identity.setRoleClaim(id.uid, role).catch(() => undefined);
  return user;
}

/**
 * @param required  reject anonymous requests with 401
 * @param checkRevoked  also check Firebase token revocation (extra network hop;
 *                      used for privileged routes so suspensions apply instantly)
 */
export function authenticate(deps: AuthDeps, opts: { required: boolean; checkRevoked?: boolean }): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearer(req);
    if (!token) {
      if (opts.required) throw unauthenticated();
      return next();
    }
    const id = await deps.identity.verify(token, { checkRevoked: opts.checkRevoked });
    const user = await resolveUser(deps, id);
    if (user.status === 'suspended') throw new AppError('ACCOUNT_SUSPENDED', 'This account has been suspended');
    req.identity = id;
    req.user = user;
    next();
  };
}

const RANK: Record<Role, number> = { user: 0, editor: 1, admin: 2 };

/** Role-based access control: require at least `min` role. */
export const requireRole =
  (min: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw unauthenticated();
    if (RANK[req.user.role] < RANK[min]) throw forbidden();
    next();
  };

/** Content contributions require a verified email (reduces throwaway spam accounts). */
export const requireVerifiedEmail: RequestHandler = (req, _res, next) => {
  if (!req.user?.emailVerified) throw forbidden('Please verify your email address first');
  next();
};
