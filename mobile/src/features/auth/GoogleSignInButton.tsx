import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authErrorKey, useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui';
import { env } from '@/config/env';

WebBrowser.maybeCompleteAuthSession();

/** Google sign-in via expo-auth-session → Google ID token → Firebase signInWithCredential. */
export function GoogleSignInButton({ onSuccess, onError }: { onSuccess: () => void; onError: (key: string) => void }) {
  const { t, i18n } = useTranslation();
  const { signInWithGoogleIdToken } = useAuth();
  const [busy, setBusy] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: env.google.webClientId || undefined,
    iosClientId: env.google.iosClientId || undefined,
    androidClientId: env.google.androidClientId || undefined,
    language: i18n.language,
    selectAccount: true,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') onError('auth.errors.google');
      return;
    }
    const idToken = response.params.id_token;
    if (!idToken) {
      onError('auth.errors.google');
      return;
    }
    setBusy(true);
    signInWithGoogleIdToken(idToken)
      .then(onSuccess)
      .catch((e: unknown) => onError(authErrorKey(e)))
      .finally(() => setBusy(false));
  }, [response, signInWithGoogleIdToken, onSuccess, onError]);

  return (
    <Button
      title={t('auth.google')}
      icon="logo-google"
      variant="ghost"
      disabled={!request}
      loading={busy}
      onPress={() => void promptAsync()}
    />
  );
}
