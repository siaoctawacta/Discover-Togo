import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KINDS, type Kind, type MapPin } from '@/api/types';
import { PinsMap } from '@/components/map/PinsMap';
import { AppText, ErrorState, IconButton, OfflineBanner, Skeleton } from '@/components/ui';
import { useMapPins } from '@/hooks/useMapPins';
import { listingHref } from '@/lib/navigation';
import { useLocationStore } from '@/store/location';
import { useTheme } from '@/theme';

export default function MapScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const [kinds, setKinds] = useState<Kind[]>([...KINDS]);
  const pins = useMapPins(kinds);
  const coords = useLocationStore((s) => s.coords);
  const requestLocation = useLocationStore((s) => s.request);

  const onOpenPin = useCallback((pin: MapPin) => router.push(listingHref(pin)), []);
  const toggle = (k: Kind) => setKinds((cur) => (cur.includes(k) ? (cur.length > 1 ? cur.filter((x) => x !== k) : cur) : [...cur, k]));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top }}>
        <OfflineBanner />
      </View>
      <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingTop: spacing.md }]}>
        <AppText variant="title" accessibilityRole="header" style={{ flex: 1 }}>
          {t('map.title')}
        </AppText>
        <IconButton icon="locate" variant="muted" onPress={() => void requestLocation()} accessibilityLabel={t('map.nearMe')} />
      </View>
      <View style={[styles.legend, { paddingHorizontal: spacing.xl, paddingVertical: spacing.md }]}>
        {KINDS.map((k) => {
          const on = kinds.includes(k);
          return (
            <Pressable
              key={k}
              onPress={() => toggle(k)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.legendItem, { borderColor: on ? colors.kind[k] : colors.border, backgroundColor: on ? colors.surfaceMuted : 'transparent' }]}
            >
              <View style={[styles.dot, { backgroundColor: colors.kind[k], opacity: on ? 1 : 0.35 }]} />
              <AppText variant="label" color={on ? 'text' : 'textMuted'}>
                {t(`kinds.${k}Plural`)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>
        {pins.isLoading ? (
          <Skeleton height="100%" radius={0} />
        ) : pins.isError && !pins.data ? (
          <ErrorState error={pins.error} onRetry={() => pins.refetch()} />
        ) : (
          <PinsMap pins={pins.data ?? []} onOpenPin={onOpenPin} userLocation={coords} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  legend: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
