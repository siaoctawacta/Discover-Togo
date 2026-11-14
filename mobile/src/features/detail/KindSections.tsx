import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Amenity, Listing } from '@/api/types';
import { AppText } from '@/components/ui';
import { formatXOF, priceLevelLabel } from '@/lib/format';
import { useTheme } from '@/theme';
import { InfoRow } from './InfoRow';

const AMENITY_ICONS: Record<Amenity, keyof typeof Ionicons.glyphMap> = {
  wifi: 'wifi',
  pool: 'water',
  parking: 'car',
  restaurant: 'restaurant',
  bar: 'wine',
  air_conditioning: 'snow',
  gym: 'barbell',
  spa: 'flower',
  airport_shuttle: 'airplane',
  beach_access: 'umbrella',
  breakfast: 'cafe',
  conference_room: 'people',
};

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="heading" accessibilityRole="header">
      {children}
    </AppText>
  );
}

export function PlaceInfo({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const fee = listing.entryFee === null ? t('detail.free') : listing.entryFee ? formatXOF(listing.entryFee.amount) : null;
  return (
    <View style={{ gap: 12 }}>
      {listing.category ? <InfoRow icon="pricetag-outline" label={t('filters.category')} value={t(`categories.${listing.category}`)} /> : null}
      {listing.openingHours ? <InfoRow icon="time-outline" label={t('detail.openingHours')} value={listing.openingHours} /> : null}
      {fee ? <InfoRow icon="ticket-outline" label={t('detail.entryFee')} value={listing.entryFee?.note ? `${fee} · ${listing.entryFee.note}` : fee} /> : null}
      {listing.address ? <InfoRow icon="navigate-outline" label={t('detail.address')} value={listing.address} /> : null}
    </View>
  );
}

export function RestaurantInfo({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {listing.cuisine ? <InfoRow icon="restaurant-outline" label={t('filters.cuisine')} value={t(`cuisines.${listing.cuisine}`)} /> : null}
      {listing.priceLevel ? <InfoRow icon="cash-outline" label={t('filters.price')} value={priceLevelLabel(listing.priceLevel)} /> : null}
      {listing.openingHours ? <InfoRow icon="time-outline" label={t('detail.openingHours')} value={listing.openingHours} /> : null}
      {listing.address ? <InfoRow icon="navigate-outline" label={t('detail.address')} value={listing.address} /> : null}
      {listing.menu?.length ? (
        <View style={{ gap: 8, marginTop: 8 }}>
          <SectionTitle>{t('detail.menu')}</SectionTitle>
          {listing.menu.slice(0, 30).map((item, i) => (
            <View key={`${item.name}-${i}`} style={[styles.menuRow, { borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="label" weight="semibold">
                  {item.name}
                </AppText>
                {item.description ? (
                  <AppText variant="caption" color="textMuted">
                    {item.description}
                  </AppText>
                ) : null}
              </View>
              <AppText variant="label" color="accent" weight="semibold">
                {formatXOF(item.price)}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function HotelInfo({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {listing.hotelType ? (
        <InfoRow icon="business-outline" label={t('filters.hotelType')} value={`${t(`hotelTypes.${listing.hotelType}`)}${listing.stars ? ` · ${'★'.repeat(Math.min(5, listing.stars))}` : ''}`} />
      ) : null}
      {listing.priceRange ? (
        <InfoRow icon="cash-outline" label={t('detail.perNight')} value={`${formatXOF(listing.priceRange.min)} – ${formatXOF(listing.priceRange.max)}`} />
      ) : null}
      {listing.address ? <InfoRow icon="navigate-outline" label={t('detail.address')} value={listing.address} /> : null}
      {listing.amenities?.length ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <SectionTitle>{t('detail.amenities')}</SectionTitle>
          <View style={styles.amenities}>
            {listing.amenities.map((a) => (
              <View key={a} style={[styles.amenity, { backgroundColor: colors.surfaceMuted }]}>
                <Ionicons name={AMENITY_ICONS[a] ?? 'checkmark'} size={14} color={colors.brand} />
                <AppText variant="caption" weight="medium">
                  {t(`amenities.${a}`)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenity: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
});
