import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Listing, PlaceCategory } from '@/api/types';
import { HeroCarousel } from '@/components/home/HeroCarousel';
import { HorizontalListingList } from '@/components/listing/HorizontalListingList';
import { AdSlot, AppText, Button, CategoryTabs, ErrorState, IconButton, OfflineBanner, SectionHeader, Skeleton, type TabItem } from '@/components/ui';
import { useHome, useRecommendations } from '@/hooks/useHome';
import { useListings } from '@/hooks/useListings';
import { useLocationStore } from '@/store/location';
import { useTheme } from '@/theme';

type HomeTab = 'featured' | Extract<PlaceCategory, 'nature' | 'culture' | 'beach' | 'city' | 'adventure'>;
const HOME_TABS: HomeTab[] = ['featured', 'nature', 'culture', 'beach', 'city', 'adventure'];

export default function HomeScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const home = useHome();
  const recs = useRecommendations();
  const [tab, setTab] = useState<HomeTab>('featured');
  const category = tab === 'featured' ? undefined : tab;
  const categoryListings = useListings('place', { category, sort: 'popular' });
  const locationPermission = useLocationStore((s) => s.permission);
  const requestLocation = useLocationStore((s) => s.request);
  const [refreshing, setRefreshing] = useState(false);

  const tabs = useMemo<TabItem<HomeTab>[]>(() => HOME_TABS.map((id) => ({ id, label: t(id === 'featured' ? 'home.featuredTab' : `categories.${id}`) })), [t]);

  const carousel: Listing[] | undefined = tab === 'featured' ? home.data?.featured : categoryListings.data?.items.slice(0, 10);
  const carouselLoading = tab === 'featured' ? home.isLoading : categoryListings.isLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([home.refetch(), recs.refetch(), categoryListings.refetch()]);
    setRefreshing(false);
  }, [home, recs, categoryListings]);

  const onBell = () => {
    if (Platform.OS === 'web') router.push('/settings');
    else Alert.alert(t('home.notificationsTitle'), t('home.notificationsEmpty'));
  };

  if (home.isError && !home.data) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
        <OfflineBanner />
        <ErrorState error={home.error} onRetry={() => home.refetch()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingTop: insets.top }}>
        <OfflineBanner />
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingHorizontal: spacing.xl, paddingTop: spacing.lg }]}>
          <View style={{ flex: 1 }}>
            <AppText variant="title" accessibilityRole="header" style={{ fontSize: 28 }}>
              {t('home.title')}
            </AppText>
            <AppText variant="caption" color="textMuted">
              {t('home.subtitle')}
            </AppText>
          </View>
          <IconButton icon="search" variant="muted" size={38} onPress={() => router.push('/search')} accessibilityLabel={t('common.search')} />
          <IconButton icon="notifications-outline" variant="muted" size={38} onPress={onBell} accessibilityLabel={t('home.notificationsTitle')} />
        </View>

        {/* Search bar */}
        <Pressable
          onPress={() => router.push('/search')}
          accessibilityRole="search"
          accessibilityLabel={t('search.placeholder')}
          style={[styles.search, { marginHorizontal: spacing.xl, backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <AppText color="textMuted">{t('search.placeholder')}</AppText>
        </Pressable>

        {/* Hero */}
        <View style={{ marginTop: spacing.lg }}>
          {home.isLoading ? (
            <Skeleton height={190} radius={28} style={{ marginHorizontal: spacing.xl, width: undefined }} />
          ) : (
            <HeroCarousel items={home.data?.hero ?? []} />
          )}
        </View>

        {/* Category tabs + tall carousel (reference "Discover" screen) */}
        <View style={{ marginTop: spacing.xl }}>
          <CategoryTabs items={tabs} value={tab} onChange={setTab} />
        </View>
        <Animated.View key={tab} entering={FadeIn.duration(250)} style={{ marginTop: spacing.lg }}>
          {!carouselLoading && !carousel?.length ? (
            <AppText color="textMuted" style={{ paddingHorizontal: spacing.xl }}>
              {t('home.emptyCategory')}
            </AppText>
          ) : (
            <HorizontalListingList items={carousel} loading={carouselLoading} variant="tall" />
          )}
        </Animated.View>

        {/* Popular experiences — compact "Top Destination" style */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('home.experiences')} moreButton actionLabel={t('common.seeAll')} onAction={() => router.push('/(tabs)/explore')} />
          <HorizontalListingList items={home.data?.experiences} loading={home.isLoading} variant="compact" />
        </View>

        <View style={{ marginTop: spacing.xxl }}>
          <AdSlot placement="home-mid" />
        </View>

        {/* Top restaurants */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('home.topRestaurants')} actionLabel={t('common.seeAll')} onAction={() => router.push({ pathname: '/list/[kind]', params: { kind: 'restaurant' } })} />
          <HorizontalListingList items={home.data?.topRestaurants} loading={home.isLoading} variant="medium" />
        </View>

        {/* Top hotels */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader title={t('home.topHotels')} actionLabel={t('common.seeAll')} onAction={() => router.push({ pathname: '/list/[kind]', params: { kind: 'hotel' } })} />
          <HorizontalListingList items={home.data?.topHotels} loading={home.isLoading} variant="medium" />
        </View>

        {/* Recommended for you */}
        <View style={{ marginTop: spacing.xxl }}>
          <SectionHeader
            title={t('home.recommended')}
            actionLabel={locationPermission !== 'granted' ? t('home.useLocation') : undefined}
            onAction={locationPermission !== 'granted' ? () => void requestLocation() : undefined}
          />
          {recs.data?.reason ? (
            <AppText variant="caption" color="textMuted" style={{ paddingHorizontal: spacing.xl, marginTop: -spacing.sm, marginBottom: spacing.sm }}>
              {t(`home.reason.${recs.data.reason}`)}
            </AppText>
          ) : null}
          {recs.isError && !recs.data ? (
            <AppText color="textMuted" style={{ paddingHorizontal: spacing.xl }}>
              {t('errors.sectionUnavailable')}
            </AppText>
          ) : (
            <HorizontalListingList items={recs.data?.data} loading={recs.isLoading} variant="compact" />
          )}
        </View>

        {/* CTAs */}
        <View style={[styles.ctaRow, { paddingHorizontal: spacing.xl, marginTop: spacing.xxl }]}>
          <Button title={t('home.ctaExplore')} icon="compass-outline" compact onPress={() => router.push('/(tabs)/explore')} style={{ flex: 1 }} />
          <Button title={t('home.ctaBook')} icon="bed-outline" variant="brand" compact onPress={() => router.push({ pathname: '/list/[kind]', params: { kind: 'hotel' } })} style={{ flex: 1 }} />
          <Button title={t('home.ctaSave')} icon="heart-outline" variant="secondary" compact onPress={() => router.push('/(tabs)/saved')} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: 999, paddingHorizontal: 18, marginTop: 16 },
  ctaRow: { flexDirection: 'row', gap: 10 },
});
