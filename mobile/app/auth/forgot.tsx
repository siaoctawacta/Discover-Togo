import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authErrorKey, useAuth } from '@/auth/AuthProvider';
import { AppText, Button, TextField } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { isEmail } from '@/lib/validators';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword, firebaseConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (!isEmail(email)) return;
    setBusy(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      const key = authErrorKey(e);
      // Don't reveal whether an account exists.
      if (key === 'auth.errors.invalidCredentials') setSent(true);
      else setError(key);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      {!firebaseConfigured ? (
        <AppText color="danger" weight="medium">
          {t('auth.notConfigured')}
        </AppText>
      ) : null}
      {sent ? (
        <AppText color="success" weight="medium" accessibilityLiveRegion="polite">
          {t('auth.resetSent')}
        </AppText>
      ) : (
        <>
          <TextField label={t('auth.email')} icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" maxLength={254} error={touched && !isEmail(email) ? t('validation.email') : null} editable={firebaseConfigured} />
          {error ? <AppText color="danger">{t(error)}</AppText> : null}
          <Button title={t('auth.sendReset')} onPress={submit} loading={busy} disabled={!firebaseConfigured} />
        </>
      )}
    </AuthShell>
  );
}
