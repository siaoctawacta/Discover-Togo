import { DEFAULT_IMAGE_HOSTS } from '../../csp.config.ts';

const env = import.meta.env;

export const API_URL: string = (env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/+$/, '');

/** Dev login is only available outside `production` mode builds, and only when explicitly enabled. */
export const DEV_AUTH: boolean = env.MODE === 'production' ? false : env.VITE_DEV_AUTH === '1';

export const FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: env.VITE_FIREBASE_APP_ID as string | undefined,
};

export const FIREBASE_ENABLED = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.authDomain);

export const IMAGE_HOSTS: string[] = env.VITE_IMAGE_HOSTS
  ? String(env.VITE_IMAGE_HOSTS).split(',').map((h) => h.trim().toLowerCase()).filter(Boolean)
  : DEFAULT_IMAGE_HOSTS;

export const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
