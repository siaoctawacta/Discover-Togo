import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { env } from '@/config/env';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

/**
 * Monetization placeholder. Renders nothing unless EXPO_PUBLIC_ADS_ENABLED=1.
 * Swap the body for a real ad SDK banner (e.g. Google Mobile Ads) later.
 */
export function AdSlot({ placement, height = 90 }: { placement: string; height?: number }) {
  const { colors, spacing, radius } = useTheme();
  const { t } = useTranslation();
  if (!env.adsEnabled) return null;
  return (
    <View
      testID={`ad-${placement}`}
      style={[styles.slot, { height, marginHorizontal: spacing.xl, borderRadius: radius.md, borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}
    >
      <AppText variant="caption" color="textMuted">
        {t('common.ad')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ slot: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' } });
