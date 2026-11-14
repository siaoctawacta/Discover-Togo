import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatRating } from '@/lib/format';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

export const RatingBadge = memo(function RatingBadge({ rating, style }: { rating: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: colors.surface }, style]} accessibilityLabel={`★ ${formatRating(rating)}`}>
      <Ionicons name="star" size={10} color={colors.star} />
      <AppText variant="caption" weight="semibold" style={{ fontSize: 11, lineHeight: 14 }}>
        {formatRating(rating)}
      </AppText>
    </View>
  );
});

export const SponsoredBadge = memo(function SponsoredBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.badge, { backgroundColor: colors.warning }, style]}>
      <AppText variant="caption" weight="semibold" style={{ color: '#111111', fontSize: 10, lineHeight: 14 }}>
        {t('common.sponsored')}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
});
