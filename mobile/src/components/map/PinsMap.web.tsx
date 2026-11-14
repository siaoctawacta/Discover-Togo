import { memo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MapPin } from '@/api/types';
import { AppText, SafeImage } from '@/components/ui';
import { formatRating } from '@/lib/format';
import { kindIcon } from '@/lib/navigation';
import { useTheme } from '@/theme';
import type { PinsMapProps } from './types';

/** Web fallback: native maps are unavailable, so show the pins as a list. */
export const PinsMap = memo(function PinsMap({ pins, onOpenPin, style }: PinsMapProps) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const renderItem = ({ item }: { item: MapPin }) => (
    <Pressable onPress={() => onOpenPin(item)} accessibilityRole="button" style={[styles.row, { borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: colors.kind[item.kind] }]} />
      <SafeImage uri={item.coverImage} icon={kindIcon(item.kind)} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" weight="semibold" numberOfLines={1}>
          {item.name}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {t(`kinds.${item.kind}`)} · ★ {formatRating(item.rating)} · {item.location.lat.toFixed(3)}, {item.location.lng.toFixed(3)}
        </AppText>
      </View>
    </Pressable>
  );
  return (
    <View style={[{ flex: 1 }, style]}>
      <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.sm }}>
        {t('map.webFallback')}
      </AppText>
      <FlatList
        data={pins}
        keyExtractor={(p) => p.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 140 }}
        getItemLayout={(_, index) => ({ length: 64, offset: 64 * index, index })}
        windowSize={7}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { height: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 10, height: 10, borderRadius: 5 },
  thumb: { width: 44, height: 44, borderRadius: 12 },
});
