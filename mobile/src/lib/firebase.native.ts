import { getApp, getApps, initializeApp } from 'firebase/app';
import type { Auth, Persistence } from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { env, isFirebaseConfigured } from '@/config/env';
import { secureAuthPersistenceStorage } from './secureAuthPersistenceStorage';

// `getReactNativePersistence` is only exported by the react-native build of @firebase/auth
// (resolved by Metro), so it is missing from the default type declarations.
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence: (storage: typeof secureAuthPersistenceStorage) => Persistence;
};

let auth: Auth | null = null;

/** Returns the Firebase Auth instance, or null when Firebase is not configured. */
export function getFirebaseAuth(): Auth | null {
  if (!isFirebaseConfigured) return null;
  if (auth) return auth;
  const app = getApps().length ? getApp() : initializeApp(env.firebase);
  try {
    auth = FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(secureAuthPersistenceStorage),
    });
  } catch {
    // Already initialised (fast refresh).
    auth = FirebaseAuth.getAuth(app);
  }
  return auth;
}
