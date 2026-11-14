import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Listing } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { getListingRowLayout, ListingRow } from '@/components/listing/ListingRow';
import { AppText, EmptyState, ErrorState, KenteStripe, ListSkeleton, OfflineBanner, SegmentedControl } from '@/components/ui';
import { useFavorites } from '@/hooks/useFavorites';
import { useIsOnline } from '@/hooks/useNetwork';
import { useOfflineStore } from '@/store/offline';
import { useTheme } from '@/theme';

type Tab = 'favorites' | 'offline';
const keyExtractor = (l: Listing) => l.id;

export default function SavedScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { colors, spacing } = useTheme();
  const online = useIsOnline();
  const { status } = useAuth();
  const [tab, setTab] = useState<Tab>(online ? 'favorites' : 'offline');
  const favorites = useFavorites();
  const offlineEntries = useOfflineStore((s) => s.items);
  const removeOffline = useOfflineStore((s) => s.remove);
  const offlineItems = useMemo(() => offlineEntries.map((e) => e.listing), [offlineEntries]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await favorites.refetch().catch(() => undefined);
    setRefreshing(false);
  }, [favorites]);

  const renderOffline = useCallback(
    ({ item }: { item: Listing }) => (
      <ListingRow
        listing={item}
        right={
          <Pressable onPress={() => removeOffline(item.id)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('offline.remove')}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        }
      />
    ),
    [removeOffline, t, colors.textMuted],
  );
  const renderFavorite = useCallback(({ item }: { item: Listing }) => <ListingRow listing={item} />, []);

  let body: React.ReactNode;
  if (tab === 'offline') {
    body = (
      <FlatList
        data={offlineItems}
        keyExtractor={keyExtractor}
        renderItem={renderOffline}
        getItemLayout={getListingRowLayout}
        windowSize={9}
        contentContainerStyle={{ flexGrow: 1 }}
        ListEmptyComponent={<EmptyState icon="download-outline" title={t('saved.offlineEmptyTitle')} message={t('saved.offlineEmptyMessage')} />}
      />
    );
  } else if (status !== 'signedIn') {
    body = (
      <EmptyState
        icon="heart-outline"
        title={t('saved.signInTitle')}
        message={t('saved.signInMessage')}
        actionLabel={t('auth.login')}
        onAction={() => router.push({ pathname: '/auth/login', params: { reason: 'favorite' } })}
      />
    );
  } else if (favorites.isLoading) {
    body = <ListSkeleton />;
  } else if (favorites.isError && !favorites.data) {
    body = <ErrorState error={favorites.error} onRetry={() => favorites.refetch()} />;
  } else {
    body = (
      <FlatList
        data={favorites.data ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderFavorite}
        getItemLayout={getListingRowLayout}
        windowSize={9}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
        ListEmptyComponent={
          <EmptyState icon="heart-outline" title={t('saved.emptyTitle')} message={t('saved.emptyMessage')} actionLabel={t('home.ctaExplore')} onAction={() => router.push('/(tabs)/explore')} />
        }
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <OfflineBanner />
      <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.md, paddingBottom: spacing.md }}>
        <View>
          <AppText variant="title" accessibilityRole="header">
            {t('saved.title')}
          </AppText>
          <KenteStripe width={48} height={4} style={{ marginTop: 4 }} />
        </View>
        <SegmentedControl
          options={[
            { id: 'favorites', label: `${t('saved.favorites')}${favorites.data ? ` (${favorites.data.length})` : ''}` },
            { id: 'offline', label: `${t('saved.offline')} (${offlineItems.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>
      {body}
    </View>
  );
}
