import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Listing } from '@/api/types';
import { AppText, PressableScale, SafeImage } from '@/components/ui';
import { kindIcon, listingHref } from '@/lib/navigation';
import { useTheme } from '@/theme';

export const COMPACT_CARD_WIDTH = 176;

/** Compact horizontal card: rounded thumbnail + name + city (reference "Top Destination"). */
export const ListingCardCompact = memo(function ListingCardCompact({ listing }: { listing: Listing }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={() => router.push(listingHref(listing))}
      accessibilityRole="button"
      accessibilityLabel={`${listing.name}, ${listing.city}`}
      style={[styles.card, { backgroundColor: colors.surfaceMuted, width: COMPACT_CARD_WIDTH }]}
    >
      <SafeImage uri={listing.coverImage} icon={kindIcon(listing.kind)} style={styles.thumb} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" weight="semibold" numberOfLines={1}>
          {listing.name}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {listing.city}
        </AppText>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 20, paddingRight: 12 },
  thumb: { width: 60, height: 60, borderRadius: 20 },
});
