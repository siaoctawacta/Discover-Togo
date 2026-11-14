import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { authErrorKey, useAuth } from '@/auth/AuthProvider';
import { AppText, Button, TextField, goBackOr } from '@/components/ui';
import { AuthShell } from '@/features/auth/AuthShell';
import { DISPLAY_NAME_MAX, PASSWORD_MIN, isEmail, validateDisplayName, validatePassword } from '@/lib/validators';

export default function SignupScreen() {
  const { t } = useTranslation();
  const { signUp, firebaseConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameErr = validateDisplayName(name);
  const emailErr = isEmail(email) ? null : 'validation.email';
  const pwErr = validatePassword(password);

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (nameErr || emailErr || pwErr) return;
    setBusy(true);
    try {
      await signUp(email, password, name);
      goBackOr();
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={t('auth.createAccount')} subtitle={t('auth.signupSubtitle')}>
      {!firebaseConfigured ? (
        <AppText color="danger" weight="medium">
          {t('auth.notConfigured')}
        </AppText>
      ) : null}
      <TextField label={t('auth.displayName')} icon="person-outline" value={name} onChangeText={setName} maxLength={DISPLAY_NAME_MAX} autoComplete="name" error={touched && nameErr ? t(nameErr, { max: DISPLAY_NAME_MAX }) : null} editable={firebaseConfigured} />
      <TextField label={t('auth.email')} icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" maxLength={254} error={touched && emailErr ? t(emailErr) : null} editable={firebaseConfigured} />
      <TextField
        label={t('auth.password')}
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        secureToggle
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={128}
        hint={t('validation.passwordShort', { min: PASSWORD_MIN })}
        error={touched && pwErr ? t(pwErr, { min: PASSWORD_MIN }) : null}
        editable={firebaseConfigured}
      />
      {error ? <AppText color="danger">{t(error)}</AppText> : null}
      <Button title={t('auth.signup')} onPress={submit} loading={busy} disabled={!firebaseConfigured} />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 8 }}>
        <AppText color="textMuted">{t('auth.haveAccount')}</AppText>
        <Pressable onPress={() => router.replace('/auth/login')} accessibilityRole="link">
          <AppText color="accent" weight="semibold">
            {t('auth.login')}
          </AppText>
        </Pressable>
      </View>
    </AuthShell>
  );
}
