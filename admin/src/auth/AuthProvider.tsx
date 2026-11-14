import { useQueryClient } from '@tanstack/react-query';
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { ApiError, onApiError, setTokenProvider } from '../lib/api';
import { DEV_AUTH, INACTIVITY_LIMIT_MS } from '../lib/config';
import { endpoints } from '../lib/endpoints';

// Firebase is loaded on demand so dev-only setups and the first paint don't pay for the SDK.
const fb = () => import('../lib/firebase');
const firebaseSignOut = async () => (await fb()).firebaseSignOut();
const firebaseIdToken = async () => (await fb()).firebaseIdToken();
import type { Me, Role } from '../lib/types';
import { useInactivity } from './useInactivity';

const DEV_TOKEN_KEY = 'dt-admin-dev-token';
type Mode = 'none' | 'dev' | 'firebase';
type Status = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: Status;
  me: Me | null;
  notice: string | null;
}

interface AuthApi extends AuthState {
  isAdmin: boolean;
  devSignIn: (uid: string, role: 'editor' | 'admin') => Promise<void>;
  emailSignIn: (email: string, password: string) => Promise<void>;
  googleSignIn: () => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthApi | null>(null);

export const ACCESS_DENIED = 'Access denied: this account is not an editor or administrator.';

function readDevToken(): string | null {
  if (!DEV_AUTH) return null;
  try {
    return sessionStorage.getItem(DEV_TOKEN_KEY);
  } catch {
    return null;
  }
}
function writeDevToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(DEV_TOKEN_KEY, token);
    else sessionStorage.removeItem(DEV_TOKEN_KEY);
  } catch {
    /* storage unavailable: dev session lasts for this page only */
  }
}

function isStaff(role: Role): boolean {
  return role === 'editor' || role === 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>(() => ({
    status: readDevToken() ? 'loading' : 'signedOut',
    me: null,
    notice: null,
  }));
  const mode = useRef<Mode>('none');
  const devToken = useRef<string | null>(null);

  useEffect(() => {
    setTokenProvider(async () => {
      if (mode.current === 'dev') return devToken.current;
      if (mode.current === 'firebase') return firebaseIdToken();
      return null;
    });
  }, []);

  const signOut = useCallback(
    async (notice?: string) => {
      const wasFirebase = mode.current === 'firebase';
      mode.current = 'none';
      devToken.current = null;
      writeDevToken(null);
      if (wasFirebase) await firebaseSignOut().catch(() => undefined);
      queryClient.clear();
      setState({ status: 'signedOut', me: null, notice: notice ?? null });
    },
    [queryClient],
  );

  /** Verify the token with GET /me and only then commit the session. */
  const establish = useCallback(
    async (nextMode: Mode, token: string) => {
      let me: Me;
      try {
        me = await endpoints.me(token);
      } catch (e) {
        await (nextMode === 'firebase' ? firebaseSignOut().catch(() => undefined) : Promise.resolve());
        if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) {
          writeDevToken(null);
          setState({ status: 'signedOut', me: null, notice: ACCESS_DENIED });
          return;
        }
        throw e;
      }
      if (!isStaff(me.role) || me.status !== 'active') {
        if (nextMode === 'firebase') await firebaseSignOut().catch(() => undefined);
        writeDevToken(null);
        setState({ status: 'signedOut', me: null, notice: ACCESS_DENIED });
        return;
      }
      mode.current = nextMode;
      if (nextMode === 'dev') {
        devToken.current = token;
        writeDevToken(token);
      }
      setState({ status: 'signedIn', me, notice: null });
    },
    [],
  );

  // Restore a dev session (sessionStorage, dev mode only). Firebase uses in-memory persistence,
  // so there is never a session to restore after a reload.
  useEffect(() => {
    const t = readDevToken();
    if (!t) return;
    // oxlint-disable-next-line react/set-state-in-effect -- async: runs after the /me round-trip
    establish('dev', t).catch(() => setState({ status: 'signedOut', me: null, notice: null }));
  }, [establish]);

  // Global 401 handling: any unauthenticated response ends the session.
  useEffect(
    () =>
      onApiError((err) => {
        if (err.status === 401 && mode.current !== 'none') {
          void signOut('Your session has expired. Please sign in again.');
        }
      }),
    [signOut],
  );

  useInactivity(state.status === 'signedIn', INACTIVITY_LIMIT_MS, () => {
    void signOut('You were signed out after 30 minutes of inactivity.');
  });

  const devSignIn = useCallback(
    async (uid: string, role: 'editor' | 'admin') => {
      if (!DEV_AUTH) throw new Error('Dev login is disabled');
      await establish('dev', `dev:${uid}:${role}`);
    },
    [establish],
  );

  const emailSignIn = useCallback(
    async (email: string, password: string) => {
      const f = await fb();
      let token: string;
      try {
        const user = await f.firebaseEmailSignIn(email, password);
        token = await user.getIdToken();
      } catch (e) {
        throw new Error(f.firebaseErrorMessage(e));
      }
      await establish('firebase', token);
    },
    [establish],
  );

  const googleSignIn = useCallback(async () => {
    const f = await fb();
    let token: string;
    try {
      const user = await f.firebaseGoogleSignIn();
      token = await user.getIdToken();
    } catch (e) {
      throw new Error(f.firebaseErrorMessage(e));
    }
    await establish('firebase', token);
  }, [establish]);

  const clearNotice = useCallback(() => setState((s) => ({ ...s, notice: null })), []);

  const value = useMemo<AuthApi>(
    () => ({
      ...state,
      isAdmin: state.me?.role === 'admin',
      devSignIn,
      emailSignIn,
      googleSignIn,
      signOut,
      clearNotice,
    }),
    [state, devSignIn, emailSignIn, googleSignIn, signOut, clearNotice],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
