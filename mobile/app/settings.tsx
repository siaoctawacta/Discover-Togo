import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthProvider';
import { AppText, Button, KenteStripe, ScreenHeader, SegmentedControl } from '@/components/ui';
import { env } from '@/config/env';
import { useUpdateMe } from '@/hooks/useMe';
import { LANGUAGES, toApiLang, type SupportedLanguage } from '@/i18n/languages';
import { confirm, notify } from '@/lib/confirm';
import { queryPersister } from '@/lib/queryClient';
import { MAX_OFFLINE_ITEMS, useOfflineStore } from '@/store/offline';
import { usePrefs, type ThemeMode } from '@/store/prefs';
import { useTheme } from '@/theme';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceMuted, padding: spacing.lg, gap: spacing.md }]}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const qc = useQueryClient();
  const { status } = useAuth();
  const updateMe = useUpdateMe();
  const theme = usePrefs((s) => s.theme);
  const language = usePrefs((s) => s.language);
  const setTheme = usePrefs((s) => s.setTheme);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const offlineCount = useOfflineStore((s) => s.items.length);
  const clearOffline = useOfflineStore((s) => s.clear);

  const syncRemote = (prefs: { language?: 'en' | 'fr'; theme?: ThemeMode }) => {
    if (status === 'signedIn') updateMe.mutate({ preferences: prefs });
  };

  const langOptions = [{ id: 'system' as const, label: t('settings.system') }, ...LANGUAGES.map((l) => ({ id: l.code, label: l.label }))];
  const themeOptions: { id: ThemeMode; label: string }[] = [
    { id: 'system', label: t('settings.system') },
    { id: 'light', label: t('settings.light') },
    { id: 'dark', label: t('settings.dark') },
  ];

  const onClearOffline = async () => {
    const ok = await confirm({ title: t('settings.clearOffline'), message: t('settings.clearOfflineConfirm'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
    if (ok) clearOffline();
  };
  const onClearCache = async () => {
    qc.clear();
    await queryPersister.removeClient();
    notify(t('settings.cacheCleared'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Card title={t('settings.language')}>
          <SegmentedControl
            options={langOptions}
            value={language ?? 'system'}
            onChange={(v) => {
              const next = v === 'system' ? null : (v as SupportedLanguage);
              setLanguage(next);
              if (next) syncRemote({ language: toApiLang(next) });
            }}
          />
        </Card>
        <Card title={t('settings.theme')}>
          <SegmentedControl
            options={themeOptions}
            value={theme}
            onChange={(v) => {
              setTheme(v);
              syncRemote({ theme: v });
            }}
          />
        </Card>
        <Card title={t('settings.offlineData')}>
          <AppText color="textMuted">{t('settings.offlineSummary', { count: offlineCount, max: MAX_OFFLINE_ITEMS })}</AppText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={t('settings.clearOffline')} variant="danger" compact onPress={onClearOffline} disabled={!offlineCount} style={{ flex: 1 }} />
            <Button title={t('settings.clearCache')} variant="ghost" compact onPress={onClearCache} style={{ flex: 1 }} />
          </View>
        </Card>
        <Card title={t('settings.about')}>
          <AppText color="textMuted">{t('settings.aboutText')}</AppText>
          <KenteStripe width={64} height={4} />
          <AppText variant="subheading">{t('settings.privacy')}</AppText>
          <AppText color="textMuted">{t('settings.privacyText')}</AppText>
          <AppText variant="caption" color="textMuted">
            {t('settings.version', { version: Constants.expoConfig?.version ?? '1.0.0' })} · {env.apiUrl.replace(/^https?:\/\//, '')}
          </AppText>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: 24 } });
