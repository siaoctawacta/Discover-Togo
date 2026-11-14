/**
 * Central, typed access to build-time configuration (EXPO_PUBLIC_* vars are inlined by Metro).
 * Note: process.env.EXPO_PUBLIC_X must be referenced literally for inlining to work.
 */
const DEFAULT_API_URL = 'http://localhost:4000/api/v1';

const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

/**
 * Production builds refuse plaintext transport: the API client fails every request
 * (instead of silently sending data over http) when this is true.
 */
export const insecureApiUrl = !__DEV__ && !rawApiUrl.startsWith('https://');

export const env = {
  apiUrl: rawApiUrl,
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  },
  google: {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
  },
  devAuthEnabled: __DEV__ && process.env.EXPO_PUBLIC_DEV_AUTH === '1',
  adsEnabled: process.env.EXPO_PUBLIC_ADS_ENABLED === '1',
} as const;

export const isFirebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.authDomain && env.firebase.projectId && env.firebase.appId,
);

export const isGoogleSignInConfigured = Boolean(
  env.google.webClientId || env.google.iosClientId || env.google.androidClientId,
);
