import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Listing } from '@/api/types';
import { ReviewCard } from '@/components/listing/ReviewCard';
import { MiniMap } from '@/components/map/MiniMap';
import { AdSlot, AppText, Button, EmptyState, ErrorState, KenteStripe, OfflineBanner, ScreenHeader, Skeleton } from '@/components/ui';
import { ContactButtons } from '@/features/detail/ContactButtons';
import { DetailHero, HERO_HEIGHT } from '@/features/detail/DetailHero';
import { HotelInfo, PlaceInfo, RestaurantInfo, SectionTitle } from '@/features/detail/KindSections';
import { ReadMore } from '@/features/detail/ReadMore';
import { StatBoxes, type Stat } from '@/features/detail/StatBoxes';
import { useFavoriteAction } from '@/hooks/useFavoriteAction';
import { useListing } from '@/hooks/useListings';
import { useReviews } from '@/hooks/useReviews';
import { openDirections } from '@/lib/directions';
import { formatDistance, haversineKm } from '@/lib/distance';
import { formatRating, listingPrice } from '@/lib/format';
import { safeOpenUrl, sanitizeExternalUrl } from '@/lib/safeOpenUrl';
import { firstParam, isIdOrSlug, isKind } from '@/lib/validators';
import { useLocationStore } from '@/store/location';
import { MAX_OFFLINE_ITEMS, useIsSavedOffline, useOfflineStore } from '@/store/offline';
import { useTheme } from '@/theme';

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ kind: string; id: string }>();
  const kindParam = firstParam(params.kind);
  const idParam = firstParam(params.id);
  const valid = isKind(kindParam) && isIdOrSlug(idParam);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const query = useListing(valid ? kindParam : undefined, valid ? idParam : undefined);

  if (!valid) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="" />
        <EmptyState icon="alert-circle-outline" title={t('errors.invalidLink')} />
      </View>
    );
  }
  if (query.isLoading && !query.data) return <DetailSkeleton />;
  if (!query.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="" />
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      </View>
    );
  }
  return <DetailContent listing={query.data} refreshing={query.isRefetching} onRefresh={() => query.refetch()} />;
}

function DetailContent({ listing, refreshing, onRefresh }: { listing: Listing; refreshing: boolean; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const coords = useLocationStore((s) => s.coords);
  const requestLocation = useLocationStore((s) => s.request);
  const { isFavorite, toggle } = useFavoriteAction(listing);
  const savedOffline = useIsSavedOffline(listing.id);
  const reviews = useReviews(listing.id, 3);

  const distanceKm = listing.distanceKm ?? (coords ? haversineKm(coords, listing.location) : undefined);
  const price = listingPrice(listing, t('detail.free'));
  const priceLabel = listing.kind === 'place' ? t('detail.entryFee') : listing.kind === 'hotel' ? t('detail.fromPerNight') : t('detail.priceFrom');

  const stats = useMemo<Stat[]>(
    () => [
      {
        label: t('detail.distance'),
        value: formatDistance(distanceKm) ?? '—',
        onPress: distanceKm === undefined ? () => void requestLocation() : undefined,
        accessibilityHint: distanceKm === undefined ? t('home.useLocation') : undefined,
      },
      { label: priceLabel, value: price ?? '—' },
      { label: t('detail.rating'), value: formatRating(listing.rating) },
    ],
    [t, distanceKm, requestLocation, priceLabel, price, listing.rating],
  );

  const bookingUrl = sanitizeExternalUrl(listing.contact?.bookingUrl);
  const onPrimary = async () => {
    const ok = bookingUrl ? await safeOpenUrl(bookingUrl) : await openDirections(listing.location, listing.name);
    if (!ok) Alert.alert(t('errors.title'), t('errors.cannotOpen'));
  };

  const toggleOffline = (on: boolean) => {
    const store = useOfflineStore.getState();
    if (!on) return store.remove(listing.id);
    const res = store.save(listing);
    if (!res.ok) Alert.alert(t('offline.limitTitle'), t('offline.limitMessage', { max: MAX_OFFLINE_ITEMS }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
      >
        <DetailHero listing={listing} isFavorite={isFavorite} onToggleFavorite={toggle} />
        <OfflineBanner />
        <Animated.View entering={FadeInDown.duration(400)} style={{ paddingHorizontal: spacing.xl, gap: spacing.xxl, marginTop: spacing.lg }}>
          <StatBoxes stats={stats} />

          <View style={{ gap: spacing.sm }}>
            <SectionTitle>{t('detail.description')}</SectionTitle>
            <ReadMore text={listing.description} />
            {listing.tags.length ? (
              <View style={styles.tags}>
                {listing.tags.slice(0, 8).map((tag) => (
                  <AppText key={tag} variant="caption" color="textMuted" style={[styles.tag, { borderColor: colors.border }]}>
                    #{tag}
                  </AppText>
                ))}
              </View>
            ) : null}
          </View>

          {listing.kind === 'place' ? <PlaceInfo listing={listing} /> : listing.kind === 'restaurant' ? <RestaurantInfo listing={listing} /> : <HotelInfo listing={listing} />}

          <ContactButtons listing={listing} />

          <View style={{ gap: spacing.md }}>
            <View style={styles.rowBetween}>
              <SectionTitle>{t('detail.location')}</SectionTitle>
              <Pressable onPress={() => void openDirections(listing.location, listing.name)} accessibilityRole="link" hitSlop={8} style={styles.inline}>
                <Ionicons name="navigate" size={14} color={colors.accent} />
                <AppText variant="label" color="accent" weight="semibold">
                  {t('detail.directions')}
                </AppText>
              </Pressable>
            </View>
            <MiniMap location={listing.location} title={listing.name} />
          </View>

          <View style={[styles.offlineRow, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="download-outline" size={20} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <AppText variant="label" weight="semibold">
                {t('detail.saveOffline')}
              </AppText>
              <AppText variant="caption" color="textMuted">
                {t('detail.saveOfflineHint')}
              </AppText>
            </View>
            <Switch value={savedOffline} onValueChange={toggleOffline} trackColor={{ true: colors.brand, false: colors.border }} accessibilityLabel={t('detail.saveOffline')} />
          </View>

          <AdSlot placement="detail" />

          <View style={{ gap: spacing.md }}>
            <View style={styles.rowBetween}>
              <View>
                <SectionTitle>{t('detail.reviews')}</SectionTitle>
                <AppText variant="caption" color="textMuted">
                  ★ {formatRating(listing.rating)} · {t('detail.reviewCount', { count: listing.reviewCount })}
                </AppText>
              </View>
              <Pressable
                onPress={() => router.push({ pathname: '/reviews/[id]', params: { id: listing.id, name: listing.name } })}
                accessibilityRole="link"
                hitSlop={8}
              >
                <AppText variant="label" color="accent" weight="semibold">
                  {t('common.seeAll')}
                </AppText>
              </Pressable>
            </View>
            {reviews.isLoading ? (
              <Skeleton height={90} radius={20} />
            ) : reviews.data?.items.length ? (
              reviews.data.items.slice(0, 3).map((r) => <ReviewCard key={r.id} review={r} />)
            ) : (
              <AppText color="textMuted">{reviews.isError ? t('errors.sectionUnavailable') : t('reviews.empty')}</AppText>
            )}
            <Button
              title={t('reviews.write')}
              icon="create-outline"
              variant="ghost"
              onPress={() => router.push({ pathname: '/reviews/write/[id]', params: { id: listing.id, name: listing.name } })}
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer: price block + big round arrow (Book or Directions) */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color="textMuted">
            {priceLabel}
          </AppText>
          <AppText variant="title" numberOfLines={1} adjustsFontSizeToFit>
            {price ?? '—'}
          </AppText>
          <KenteStripe width={56} height={3} style={{ marginTop: 2 }} />
        </View>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          accessibilityLabel={bookingUrl ? t('detail.book') : t('detail.directions')}
          style={({ pressed }) => [styles.cta, { backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.95 : 1 }] }]}
        >
          <Ionicons name={bookingUrl ? 'arrow-forward' : 'navigate'} size={28} color={colors.primaryText} />
        </Pressable>
      </View>
    </View>
  );
}

function DetailSkeleton() {
  const { colors, spacing } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Skeleton height={HERO_HEIGHT} radius={0} style={{ borderBottomLeftRadius: 72 }} />
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={70} radius={20} style={{ flex: 1 }} />
          ))}
        </View>
        <Skeleton width="40%" height={20} />
        <Skeleton height={14} />
        <Skeleton height={14} />
        <Skeleton width="70%" height={14} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 20 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center' },
});
