import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { setTokenProvider } from '@/api/client';
import { meApi } from '@/api/me';
import { env, isFirebaseConfigured } from '@/config/env';
import i18n, { currentApiLang } from '@/i18n';
import { getFirebaseAuth } from '@/lib/firebase';
import { clearUserCaches } from '@/lib/queryClient';
import { registerPushTokenBestEffort } from '@/lib/pushNotifications';
import { secureStorage } from '@/lib/secureStorage';
import { DISPLAY_NAME_MAX } from '@/lib/validators';

export interface SessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoUrl: string | null;
  provider: 'firebase' | 'dev';
}

type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: Status;
  user: SessionUser | null;
  firebaseConfigured: boolean;
  devAuthEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  devSignIn: (uid?: string) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const DEV_SESSION_KEY = 'dt.devSession';
const DEV_UID_RE = /^[A-Za-z0-9_-]{1,64}$/;

function fromFirebase(u: FirebaseUser): SessionUser {
  return { uid: u.uid, email: u.email, displayName: u.displayName, photoUrl: u.photoURL, provider: 'firebase' };
}

export class AuthNotConfiguredError extends Error {
  constructor() {
    super('auth/not-configured');
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const devUidRef = useRef<string | null>(null);
  const auth = useMemo(() => getFirebaseAuth(), []);

  // Token provider used by the API client: always a *fresh* token.
  useEffect(() => {
    setTokenProvider(async () => {
      if (devUidRef.current) return `dev:${devUidRef.current}:user`;
      const current = auth?.currentUser;
      return current ? current.getIdToken() : null;
    });
  }, [auth]);

  const afterSignIn = useCallback(async (displayName?: string | null) => {
    try {
      await meApi.session({
        displayName: displayName ? displayName.slice(0, DISPLAY_NAME_MAX) : undefined,
        language: currentApiLang(),
      });
    } catch {
      /* profile upsert is retried implicitly by GET /me */
    }
    void registerPushTokenBestEffort();
  }, []);

  // Restore dev session (dev builds only) or subscribe to Firebase.
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      if (env.devAuthEnabled) {
        const uid = await secureStorage.get(DEV_SESSION_KEY);
        if (!cancelled && uid && DEV_UID_RE.test(uid)) {
          devUidRef.current = uid;
          setUser({ uid: `dev_${uid}`, email: `${uid}@dev.local`, displayName: uid, photoUrl: null, provider: 'dev' });
          setStatus('signedIn');
          return;
        }
      }
      if (!auth) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      unsub = onIdTokenChanged(auth, (fbUser) => {
        if (devUidRef.current) return;
        setUser(fbUser ? fromFirebase(fbUser) : null);
        setStatus(fbUser ? 'signedIn' : 'signedOut');
      });
    })();
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [auth]);

  const requireAuth = useCallback(() => {
    if (!auth) throw new AuthNotConfiguredError();
    return auth;
  }, [auth]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const cred = await signInWithEmailAndPassword(requireAuth(), email.trim(), password);
      await afterSignIn(cred.user.displayName);
    },
    [requireAuth, afterSignIn],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const name = displayName.trim().slice(0, DISPLAY_NAME_MAX);
      const cred = await createUserWithEmailAndPassword(requireAuth(), email.trim(), password);
      await updateProfile(cred.user, { displayName: name }).catch(() => undefined);
      setUser(fromFirebase(cred.user));
      await afterSignIn(name);
    },
    [requireAuth, afterSignIn],
  );

  const resetPassword = useCallback(
    async (email: string) => {
      const a = requireAuth();
      a.languageCode = i18n.language;
      await sendPasswordResetEmail(a, email.trim());
    },
    [requireAuth],
  );

  const signInWithGoogleIdToken = useCallback(
    async (idToken: string) => {
      const cred = await signInWithCredential(requireAuth(), GoogleAuthProvider.credential(idToken));
      await afterSignIn(cred.user.displayName);
    },
    [requireAuth, afterSignIn],
  );

  const devSignIn = useCallback(
    async (uid = 'tester') => {
      if (!env.devAuthEnabled || !DEV_UID_RE.test(uid)) return;
      devUidRef.current = uid;
      await secureStorage.set(DEV_SESSION_KEY, uid);
      setUser({ uid: `dev_${uid}`, email: `${uid}@dev.local`, displayName: uid, photoUrl: null, provider: 'dev' });
      setStatus('signedIn');
      await afterSignIn(uid);
    },
    [afterSignIn],
  );

  const signOut = useCallback(async () => {
    if (devUidRef.current) {
      devUidRef.current = null;
      await secureStorage.remove(DEV_SESSION_KEY);
    }
    if (auth?.currentUser) await fbSignOut(auth).catch(() => undefined);
    clearUserCaches();
    setUser(null);
    setStatus('signedOut');
  }, [auth]);

  const deleteAccount = useCallback(async () => {
    await meApi.remove();
    const current = auth?.currentUser;
    if (current) {
      // Backend also deletes the Firebase user; this is a best-effort local cleanup.
      await deleteUser(current).catch(() => undefined);
    }
    await signOut();
  }, [auth, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      firebaseConfigured: isFirebaseConfigured,
      devAuthEnabled: env.devAuthEnabled,
      signIn,
      signUp,
      resetPassword,
      signInWithGoogleIdToken,
      devSignIn,
      signOut,
      deleteAccount,
    }),
    [status, user, signIn, signUp, resetPassword, signInWithGoogleIdToken, devSignIn, signOut, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Maps Firebase / app auth errors to i18n keys. */
export function authErrorKey(e: unknown): string {
  if (e instanceof AuthNotConfiguredError) return 'auth.notConfigured';
  const code = (e as { code?: string } | null)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'auth.errors.invalidEmail';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'auth.errors.invalidCredentials';
    case 'auth/email-already-in-use':
      return 'auth.errors.emailInUse';
    case 'auth/weak-password':
      return 'auth.errors.weakPassword';
    case 'auth/too-many-requests':
      return 'auth.errors.tooMany';
    case 'auth/network-request-failed':
      return 'errors.network';
    default:
      return 'errors.generic';
  }
}
