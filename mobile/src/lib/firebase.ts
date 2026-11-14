import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserSessionPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth';
import { env, isFirebaseConfigured } from '@/config/env';

let auth: Auth | null = null;

/** Web: Firebase Auth with session-scoped persistence. Null when not configured. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (auth) return auth;
  const app = getApps().length ? getApp() : initializeApp(env.firebase);
  auth = getAuth(app);
  void setPersistence(auth, browserSessionPersistence).catch(() => undefined);
  return auth;
}
