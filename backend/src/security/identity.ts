import type { Env } from '../config/env.js';
import type { Role } from '../domain/types.js';
import { unauthenticated } from '../lib/errors.js';

export interface VerifiedIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
  /** Only set by the dev provider: lets local testers pick a role. */
  devRole?: Role;
}

/**
 * Identity port. Firebase Auth is the production identity provider; the
 * backend never sees passwords. Roles live in our DB (source of truth) and
 * are mirrored to Firebase custom claims so Storage rules can use them.
 */
export interface IdentityProvider {
  verify(token: string, opts?: { checkRevoked?: boolean }): Promise<VerifiedIdentity>;
  setRoleClaim(uid: string, role: Role): Promise<void>;
  deleteUser(uid: string): Promise<void>;
  /** Invalidate all refresh tokens, e.g. after suspension. */
  revokeSessions(uid: string): Promise<void>;
}

// A Firebase ID token is a JWT: three base64url segments. Cheap structural
// pre-check before any crypto work (and before network calls for revocation).
const JWT_RE = /^[A-Za-z0-9_-]{10,2000}\.[A-Za-z0-9_-]{10,4000}\.[A-Za-z0-9_-]{10,1000}$/;
const DEV_RE = /^dev:([A-Za-z0-9_-]{1,64}):(user|editor|admin)$/;

export function createDevIdentityProvider(): IdentityProvider {
  return {
    async verify(token) {
      const m = DEV_RE.exec(token);
      if (!m) throw unauthenticated('Invalid token');
      const uid = m[1]!;
      return { uid: `dev_${uid}`, email: `${uid}@dev.local`, emailVerified: true, name: uid, devRole: m[2] as Role };
    },
    async setRoleClaim() {},
    async deleteUser() {},
    async revokeSessions() {},
  };
}

export async function createFirebaseIdentityProvider(env: Env): Promise<IdentityProvider> {
  const { initializeApp, applicationDefault, getApps } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId: env.FIREBASE_PROJECT_ID });
  const auth = getAuth(app);

  return {
    async verify(token, opts) {
      if (!JWT_RE.test(token)) throw unauthenticated('Invalid token');
      try {
        // verifyIdToken checks signature (Google public keys), exp, iat, aud
        // (= project id) and iss. checkRevoked additionally hits the network.
        const t = await auth.verifyIdToken(token, opts?.checkRevoked ?? false);
        if (!t.email) throw unauthenticated('Account has no email');
        return {
          uid: t.uid,
          email: t.email.toLowerCase(),
          emailVerified: t.email_verified === true,
          name: typeof t.name === 'string' ? t.name : undefined,
          picture: typeof t.picture === 'string' ? t.picture : undefined,
        };
      } catch (e) {
        if (e instanceof Error && 'code' in e && e.code === 'auth/id-token-revoked')
          throw unauthenticated('Session revoked, please sign in again');
        throw unauthenticated('Invalid or expired token');
      }
    },
    async setRoleClaim(uid, role) {
      await auth.setCustomUserClaims(uid, { role });
    },
    async deleteUser(uid) {
      await auth.deleteUser(uid).catch(() => undefined);
    },
    async revokeSessions(uid) {
      await auth.revokeRefreshTokens(uid);
    },
  };
}
