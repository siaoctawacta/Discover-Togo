import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic config layered on top of app.json.
 * Injects secrets-that-are-not-really-secret (API keys restricted by bundle id / SHA-1)
 * from EXPO_PUBLIC_* env vars so they never live in source control.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const isProduction = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  // Local web QA builds (`expo export --dev`) cannot lazy-load route chunks; allow disabling async routes.
  const plugins = (config.plugins ?? []).map((p) =>
    p === 'expo-router' && process.env.EXPO_WEB_SYNC_ROUTES === '1' ? (['expo-router', { asyncRoutes: { web: false } }] as [string, unknown]) : p,
  );

  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, googleMapsApiKey: mapsKey },
    },
    android: {
      ...config.android,
      config: { ...config.android?.config, googleMaps: { apiKey: mapsKey } },
    },
    plugins: [
      ...plugins,
      // Google Maps (PROVIDER_GOOGLE) on both platforms. Restrict this key to the bundle id / SHA-1.
      ['react-native-maps', { iosGoogleMapsApiKey: mapsKey || undefined, androidGoogleMapsApiKey: mapsKey || undefined }],
      // Cleartext (http) traffic is only permitted in development builds (local API).
      ['expo-build-properties', { android: { usesCleartextTraffic: !isProduction } }],
    ],
    extra: {
      ...config.extra,
      appEnv: isProduction ? 'production' : 'development',
    },
  };
};
