import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { Listing } from '@/api/types';
import { AppText } from '@/components/ui';
import { mailtoUrl, safeOpenUrl, sanitizeExternalUrl, telUrl } from '@/lib/safeOpenUrl';
import { useTheme } from '@/theme';

type Action = { key: string; icon: keyof typeof Ionicons.glyphMap; label: string; url: string | null };

export function ContactButtons({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const c = listing.contact ?? {};
  const actions: Action[] = [
    { key: 'call', icon: 'call-outline', label: t('detail.call'), url: c.phone ? telUrl(c.phone) : null },
    { key: 'email', icon: 'mail-outline', label: t('detail.email'), url: c.email ? mailtoUrl(c.email) : null },
    { key: 'web', icon: 'globe-outline', label: t('detail.website'), url: sanitizeExternalUrl(c.website) },
    { key: 'book', icon: 'calendar-outline', label: t('detail.book'), url: sanitizeExternalUrl(c.bookingUrl) },
  ].filter((a): a is Action & { url: string } => !!a.url);

  if (!actions.length) return null;
  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={async () => {
            const ok = await safeOpenUrl(a.url);
            if (!ok) Alert.alert(t('errors.title'), t('errors.cannotOpen'));
          }}
          accessibilityRole="link"
          accessibilityLabel={a.label}
          style={({ pressed }) => [styles.btn, { backgroundColor: a.key === 'book' ? colors.primary : colors.surfaceMuted, opacity: pressed ? 0.75 : 1 }]}
        >
          <Ionicons name={a.icon} size={20} color={a.key === 'book' ? colors.primaryText : colors.text} />
          <AppText variant="caption" weight="medium" style={{ color: a.key === 'book' ? colors.primaryText : colors.text }}>
            {a.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 18 },
});
