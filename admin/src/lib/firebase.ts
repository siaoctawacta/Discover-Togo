import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserPopupRedirectResolver, GoogleAuthProvider, inMemoryPersistence, initializeAuth,
  signInWithEmailAndPassword, signInWithPopup, signOut, type Auth, type User,
} from 'firebase/auth';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/**
 * Lazily initialise Firebase Auth with in-memory persistence: ID/refresh tokens are never written
 * to localStorage/IndexedDB, so a page reload requires signing in again (deliberate for an admin tool).
 */
export function getFirebaseAuth(): Auth | null {
  if (!FIREBASE_ENABLED) return null;
  if (!auth) {
    app = initializeApp({
      apiKey: FIREBASE_CONFIG.apiKey,
      authDomain: FIREBASE_CONFIG.authDomain,
      projectId: FIREBASE_CONFIG.projectId,
      appId: FIREBASE_CONFIG.appId,
    });
    auth = initializeAuth(app, {
      persistence: inMemoryPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  }
  return auth;
}

export async function firebaseEmailSignIn(email: string, password: string): Promise<User> {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase is not configured');
  const cred = await signInWithEmailAndPassword(a, email, password);
  return cred.user;
}

export async function firebaseGoogleSignIn(): Promise<User> {
  const a = getFirebaseAuth();
  if (!a) throw new Error('Firebase is not configured');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(a, provider);
  return cred.user;
}

export async function firebaseSignOut(): Promise<void> {
  const a = getFirebaseAuth();
  if (a) await signOut(a);
}

export async function firebaseIdToken(): Promise<string | null> {
  const a = getFirebaseAuth();
  const u = a?.currentUser;
  return u ? u.getIdToken() : null;
}

/** Map Firebase error codes to safe, generic messages (avoid account enumeration hints). */
export function firebaseErrorMessage(err: unknown): string {
  const code = typeof err === 'object' && err && 'code' in err ? String((err as { code: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return 'Invalid email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.';
    case 'auth/popup-blocked':
      return 'The sign-in popup was blocked by the browser.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    default:
      return 'Sign-in failed. Please try again.';
  }
}
