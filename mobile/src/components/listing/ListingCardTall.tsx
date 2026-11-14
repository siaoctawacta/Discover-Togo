import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Listing } from '@/api/types';
import { AppText, PressableScale, RatingBadge, SafeImage, SponsoredBadge } from '@/components/ui';
import { kindIcon, listingHref } from '@/lib/navigation';
import { useTheme } from '@/theme';

export const TALL_CARD_WIDTH = 210;
export const TALL_CARD_HEIGHT = 290;

/** Tall rounded image card with white info pill (reference "La Costa" card). */
export const ListingCardTall = memo(function ListingCardTall({ listing, width = TALL_CARD_WIDTH, height = TALL_CARD_HEIGHT }: { listing: Listing; width?: number; height?: number }) {
  const { colors, radius } = useTheme();
  return (
    <PressableScale
      onPress={() => router.push(listingHref(listing))}
      accessibilityRole="button"
      accessibilityLabel={`${listing.name}, ${listing.city}`}
      style={{ width, height }}
    >
      <SafeImage uri={listing.coverImage} icon={kindIcon(listing.kind)} style={[StyleSheet.absoluteFill, { borderRadius: radius.xl }]} priority="high" />
      {listing.sponsored ? <SponsoredBadge style={styles.sponsored} /> : null}
      <View style={styles.bottom}>
        <RatingBadge rating={listing.rating} style={styles.rating} />
        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <AppText variant="label" weight="semibold" numberOfLines={1}>
            {listing.name}
          </AppText>
          <View style={styles.loc}>
            <Ionicons name="location-outline" size={11} color={colors.textMuted} />
            <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
              {listing.city}, Togo
            </AppText>
          </View>
        </View>
      </View>
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  sponsored: { position: 'absolute', top: 14, left: 14 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  rating: { alignSelf: 'flex-end', marginRight: 14, marginBottom: -8, zIndex: 1 },
  pill: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
