import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PLACE_CATEGORIES, REGIONS, type MePreferences } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { HorizontalListingList } from '@/components/listing/HorizontalListingList';
import { AppText, Button, Chip, KenteStripe, OfflineBanner, SafeImage, SectionHeader, TextField, errorMessageKey } from '@/components/ui';
import { useFavorites } from '@/hooks/useFavorites';
import { useMe, useRecent, useUpdateMe } from '@/hooks/useMe';
import { confirm, notify } from '@/lib/confirm';
import { initials } from '@/lib/format';
import { DISPLAY_NAME_MAX, validateDisplayName } from '@/lib/validators';
import { useOfflineStore } from '@/store/offline';
import { useTheme } from '@/theme';

function MenuRow({ icon, label, onPress, danger }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.brand} />
      </View>
      <AppText style={{ flex: 1 }} color={danger ? 'danger' : 'text'} weight="medium">
        {label}
      </AppText>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const { status, user, signOut, deleteAccount } = useAuth();
  const offlineCount = useOfflineStore((s) => s.items.length);

  if (status !== 'signedIn' || !user) {
    return (
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, padding: spacing.xl, gap: spacing.xl }}>
        <AppText variant="title" accessibilityRole="header">
          {t('profile.title')}
        </AppText>
        <View style={[styles.guestCard, { backgroundColor: colors.brandDeep }]}>
          <KenteStripe width={60} height={4} />
          <AppText variant="heading" style={{ color: '#FFFFFF' }}>
            {t('profile.guestTitle')}
          </AppText>
          <AppText style={{ color: 'rgba(255,255,255,0.85)' }}>{t('profile.guestMessage')}</AppText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <Button title={t('auth.login')} onPress={() => router.push('/auth/login')} style={{ flex: 1, backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' }} />
            <Button title={t('auth.signup')} variant="ghost" onPress={() => router.push('/auth/signup')} style={{ flex: 1, borderColor: 'rgba(255,255,255,0.6)' }} />
          </View>
        </View>
        <View>
          <MenuRow icon="download-outline" label={`${t('saved.offline')} (${offlineCount})`} onPress={() => router.push('/(tabs)/saved')} />
          <MenuRow icon="settings-outline" label={t('settings.title')} onPress={() => router.push('/settings')} />
        </View>
      </ScrollView>
    );
  }

  const onSignOut = async () => {
    const ok = await confirm({ title: t('profile.signOut'), message: t('profile.signOutConfirm'), confirmLabel: t('profile.signOut'), cancelLabel: t('common.cancel') });
    if (ok) await signOut();
  };
  const onDelete = async () => {
    const ok = await confirm({
      title: t('profile.deleteAccount'),
      message: t('profile.deleteConfirm'),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAccount();
      notify(t('profile.deleted'));
    } catch (e) {
      notify(t('errors.title'), t(errorMessageKey(e)));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxxl, gap: spacing.xxl }}>
        <SignedInHeader />
        <RecentSection />
        <PreferencesSection />
        <View style={{ paddingHorizontal: spacing.xl }}>
          <MenuRow icon="settings-outline" label={t('settings.title')} onPress={() => router.push('/settings')} />
          <MenuRow icon="log-out-outline" label={t('profile.signOut')} onPress={onSignOut} />
          <MenuRow icon="trash-outline" label={t('profile.deleteAccount')} onPress={onDelete} danger />
        </View>
      </ScrollView>
    </View>
  );
}

function SignedInHeader() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { user } = useAuth();
  const me = useMe();
  const favorites = useFavorites();
  const offlineCount = useOfflineStore((s) => s.items.length);
  const update = useUpdateMe();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const displayName = me.data?.displayName ?? user?.displayName ?? '';
  const email = me.data?.email ?? user?.email ?? '';
  const photo = me.data?.photoUrl ?? user?.photoUrl ?? null;
  const nameError = editing ? validateDisplayName(name) : null;

  return (
    <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg }}>
      <AppText variant="title" accessibilityRole="header">
        {t('profile.title')}
      </AppText>
      <View style={styles.headerRow}>
        {photo ? (
          <SafeImage uri={photo} style={styles.avatar} icon="person" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="title" style={{ color: '#FFFFFF' }}>
              {initials(displayName || email)}
            </AppText>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="heading" numberOfLines={1}>
            {displayName || t('profile.traveler')}
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {email}
          </AppText>
          <Pressable onPress={() => { setName(displayName); setEditing((e) => !e); }} accessibilityRole="button" hitSlop={6}>
            <AppText variant="label" color="accent">
              {t('profile.editName')}
            </AppText>
          </Pressable>
        </View>
      </View>
      {editing ? (
        <View style={{ gap: 10 }}>
          <TextField value={name} onChangeText={setName} maxLength={DISPLAY_NAME_MAX} label={t('auth.displayName')} error={nameError ? t(nameError, { max: DISPLAY_NAME_MAX }) : null} />
          <Button
            title={t('common.save')}
            compact
            loading={update.isPending}
            disabled={!!nameError}
            onPress={() => update.mutate({ displayName: name.trim() }, { onSuccess: () => setEditing(false), onError: (e) => notify(t('errors.title'), t(errorMessageKey(e))) })}
          />
        </View>
      ) : null}
      <View style={styles.stats}>
        {[
          { label: t('saved.favorites'), value: favorites.data?.length ?? '–' },
          { label: t('saved.offline'), value: offlineCount },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { borderColor: colors.border }]}>
            <AppText variant="heading" color="accent">
              {String(s.value)}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {s.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecentSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const recent = useRecent();
  return (
    <View>
      <SectionHeader title={t('profile.recentlyViewed')} />
      {!recent.isLoading && !recent.data?.length ? (
        <AppText color="textMuted" style={{ paddingHorizontal: spacing.xl }}>
          {recent.isError ? t('errors.sectionUnavailable') : t('profile.noRecent')}
        </AppText>
      ) : (
        <HorizontalListingList items={recent.data} loading={recent.isLoading} variant="compact" />
      )}
    </View>
  );
}

function PreferencesSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const me = useMe();
  const update = useUpdateMe();
  const prefs: MePreferences | undefined = me.data?.preferences;

  const toggle = <K extends 'interests' | 'regions'>(key: K, value: MePreferences[K][number]) => {
    if (!prefs) return;
    const current = prefs[key] as string[];
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    update.mutate({ preferences: { [key]: next } as Partial<MePreferences> });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <SectionHeader title={t('profile.preferences')} />
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md }}>
        <AppText variant="subheading">{t('profile.interests')}</AppText>
        <View style={styles.wrap}>
          {PLACE_CATEGORIES.map((c) => (
            <Chip key={c} label={t(`categories.${c}`)} selected={prefs?.interests.includes(c)} onPress={() => toggle('interests', c)} />
          ))}
        </View>
        <AppText variant="subheading">{t('profile.regions')}</AppText>
        <View style={styles.wrap}>
          {REGIONS.map((r) => (
            <Chip key={r} label={t(`regions.${r}`)} selected={prefs?.regions.includes(r)} onPress={() => toggle('regions', r)} />
          ))}
        </View>
        {me.isError ? (
          <AppText variant="caption" color="danger">
            {t(errorMessageKey(me.error))}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  guestCard: { borderRadius: 28, padding: 22, gap: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 76, height: 76, borderRadius: 38 },
  stats: { flexDirection: 'row', gap: 12 },
  statBox: { flex: 1, borderWidth: 1, borderRadius: 20, alignItems: 'center', paddingVertical: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
