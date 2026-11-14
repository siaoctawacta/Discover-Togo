import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Listing } from '@/api/types';
import { AppText, PressableScale, SafeImage, SponsoredBadge } from '@/components/ui';
import { formatDistance } from '@/lib/distance';
import { formatRating, listingPrice } from '@/lib/format';
import { kindIcon, listingHref } from '@/lib/navigation';
import { useTheme } from '@/theme';

/** Fixed height so lists can use getItemLayout. */
export const LISTING_ROW_HEIGHT = 104;

export function getListingRowLayout(_: ArrayLike<Listing> | null | undefined, index: number) {
  return { length: LISTING_ROW_HEIGHT, offset: LISTING_ROW_HEIGHT * index, index };
}

interface Props {
  listing: Listing;
  right?: React.ReactNode;
  onPress?: (l: Listing) => void;
}

export const ListingRow = memo(function ListingRow({ listing, right, onPress }: Props) {
  const { colors, spacing } = useTheme();
  const { t } = useTranslation();
  const price = listingPrice(listing, t('detail.free'));
  const distance = formatDistance(listing.distanceKm);
  return (
    <PressableScale
      onPress={() => (onPress ? onPress(listing) : router.push(listingHref(listing)))}
      accessibilityRole="button"
      accessibilityLabel={`${listing.name}, ${listing.city}`}
      scaleTo={0.98}
      style={[styles.row, { height: LISTING_ROW_HEIGHT, paddingHorizontal: spacing.xl }]}
    >
      <SafeImage uri={listing.coverImage} icon={kindIcon(listing.kind)} style={styles.thumb} transition={150} />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="subheading" numberOfLines={1} style={{ flexShrink: 1 }}>
            {listing.name}
          </AppText>
          {listing.sponsored ? <SponsoredBadge /> : null}
        </View>
        <View style={styles.meta}>
          <Ionicons name="location-outline" size={12} color={colors.textMuted} />
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flexShrink: 1 }}>
            {listing.city} · {t(`regions.${listing.region}`)}
          </AppText>
        </View>
        <View style={styles.meta}>
          <Ionicons name="star" size={12} color={colors.star} />
          <AppText variant="caption" weight="semibold">
            {formatRating(listing.rating)}
          </AppText>
          <AppText variant="caption" color="textMuted">
            ({listing.reviewCount})
          </AppText>
          {price ? (
            <AppText variant="caption" color="accent" weight="semibold" numberOfLines={1}>
              · {price}
            </AppText>
          ) : null}
          {distance ? (
            <AppText variant="caption" color="textMuted">
              · {distance}
            </AppText>
          ) : null}
        </View>
      </View>
      {right}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 84, height: 84, borderRadius: 22 },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
