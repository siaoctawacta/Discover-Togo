import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { authErrorKey, useAuth } from '@/auth/AuthProvider';
import { AppText, Button, TextField, goBackOr } from '@/components/ui';
import { isGoogleSignInConfigured } from '@/config/env';
import { AuthShell } from '@/features/auth/AuthShell';
import { GoogleSignInButton } from '@/features/auth/GoogleSignInButton';
import { firstParam, isEmail } from '@/lib/validators';

const REASONS = ['favorite', 'review'] as const;

export default function LoginScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ reason?: string }>();
  const reasonParam = firstParam(params.reason);
  const reason = REASONS.find((r) => r === reasonParam);
  const { signIn, firebaseConfigured, devAuthEnabled, devSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && !isEmail(email) ? t('validation.email') : null;
  const passwordError = touched && !password ? t('validation.required') : null;

  const done = useCallback(() => goBackOr(), []);
  const onError = useCallback((key: string) => setError(key), []);

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (!isEmail(email) || !password) return;
    setBusy(true);
    try {
      await signIn(email, password);
      done();
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.welcomeBack')} subtitle={reason ? t(`auth.reason.${reason}`) : t('auth.loginSubtitle')}>
      {!firebaseConfigured ? (
        <View style={{ gap: 6 }}>
          <AppText color="danger" weight="medium">
            {t('auth.notConfigured')}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {t('auth.notConfiguredHint')}
          </AppText>
        </View>
      ) : null}
      <TextField label={t('auth.email')} icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" maxLength={254} error={emailError} editable={firebaseConfigured} />
      <TextField label={t('auth.password')} icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry secureToggle autoComplete="password" textContentType="password" maxLength={128} error={passwordError} editable={firebaseConfigured} onSubmitEditing={submit} />
      <Pressable onPress={() => router.push('/auth/forgot')} accessibilityRole="link" style={{ alignSelf: 'flex-end' }} hitSlop={6}>
        <AppText variant="label" color="accent">
          {t('auth.forgot')}
        </AppText>
      </Pressable>
      {error ? (
        <AppText color="danger" accessibilityLiveRegion="polite">
          {t(error)}
        </AppText>
      ) : null}
      <Button title={t('auth.login')} onPress={submit} loading={busy} disabled={!firebaseConfigured} />
      {firebaseConfigured && isGoogleSignInConfigured ? <GoogleSignInButton onSuccess={done} onError={onError} /> : null}
      {devAuthEnabled ? (
        <Button
          title={t('auth.devLogin')}
          icon="bug-outline"
          variant="secondary"
          onPress={async () => {
            await devSignIn('tester');
            done();
          }}
        />
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        <AppText color="textMuted">{t('auth.noAccount')}</AppText>
        <Pressable onPress={() => router.replace({ pathname: '/auth/signup', params: reason ? { reason } : {} })} accessibilityRole="link">
          <AppText color="accent" weight="semibold">
            {t('auth.signup')}
          </AppText>
        </Pressable>
      </View>
    </AuthShell>
  );
}
