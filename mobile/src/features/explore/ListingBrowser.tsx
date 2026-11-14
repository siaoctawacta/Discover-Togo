import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';
import type { Kind, Listing } from '@/api/types';
import { getListingRowLayout, ListingRow } from '@/components/listing/ListingRow';
import { AppText, EmptyState, ErrorState, ListSkeleton, OfflineBanner, SegmentedControl } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useListings } from '@/hooks/useListings';
import { useLocationStore } from '@/store/location';
import { useTheme } from '@/theme';
import { noWebOutline } from '@/theme/web';
import { FilterSheet } from './FilterSheet';
import { countActiveFilters, type SheetFilters } from './filters';

interface Props {
  initialKind: Kind;
  lockKind?: boolean;
  initialFilters?: SheetFilters;
  header?: React.ReactNode;
}

const keyExtractor = (l: Listing) => l.id;
const renderItem = ({ item }: { item: Listing }) => <ListingRow listing={item} />;

/** Kind-aware list with search, filter sheet, infinite scroll and pull-to-refresh. */
export function ListingBrowser({ initialKind, lockKind, initialFilters, header }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, fonts } = useTheme();
  const [kind, setKind] = useState<Kind>(initialKind);
  const [filtersByKind, setFiltersByKind] = useState<Partial<Record<Kind, SheetFilters>>>(() => ({ [initialKind]: initialFilters ?? { sort: 'popular' } }));
  const filters = filtersByKind[kind] ?? { sort: 'popular' };
  const [text, setText] = useState('');
  const q = useDebouncedValue(text.trim(), 300);
  const [sheetOpen, setSheetOpen] = useState(false);
  const coords = useLocationStore((s) => s.coords);

  const query = useListings(kind, {
    ...filters,
    q: q.length >= 2 ? q.slice(0, 80) : undefined,
    lat: coords?.lat,
    lng: coords?.lng,
  });

  const activeCount = countActiveFilters(kind, filters);
  const kindOptions = useMemo(() => (['place', 'restaurant', 'hotel'] as Kind[]).map((k) => ({ id: k, label: t(`kinds.${k}Plural`) })), [t]);

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await query.refetch().catch(() => undefined);
    setRefreshing(false);
  }, [query]);

  const items = query.data?.items ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <OfflineBanner />
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.md, paddingBottom: spacing.md }}>
        {header}
        {!lockKind ? <SegmentedControl options={kindOptions} value={kind} onChange={setKind} /> : null}
        <View style={styles.searchRow}>
          <View style={[styles.search, { backgroundColor: colors.surfaceMuted }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('explore.searchPlaceholder', { kind: t(`kinds.${kind}Plural`).toLowerCase() })}
              placeholderTextColor={colors.textMuted}
              maxLength={80}
              returnKeyType="search"
              autoCorrect={false}
              style={[styles.input, { color: colors.text, fontFamily: fonts.regular }, noWebOutline]}
              accessibilityLabel={t('common.search')}
            />
            {text ? (
              <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={() => setSheetOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('filters.title')}
            style={[styles.filterBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="options-outline" size={20} color={colors.primaryText} />
            {activeCount > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                <AppText variant="caption" weight="bold" style={{ color: '#111', fontSize: 10, lineHeight: 13 }}>
                  {activeCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        </View>
        {query.data ? (
          <AppText variant="caption" color="textMuted">
            {t('explore.results', { count: query.data.total })}
          </AppText>
        ) : null}
      </View>

      {query.isLoading ? (
        <ListSkeleton />
      ) : query.isError && !items.length ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getListingRowLayout}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          windowSize={9}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={<EmptyState icon="search-outline" title={t('explore.emptyTitle')} message={t('explore.emptyMessage')} />}
          ListFooterComponent={query.isFetchingNextPage ? <ListSkeleton count={1} /> : <View style={{ height: spacing.xxl }} />}
          contentContainerStyle={{ flexGrow: 1 }}
        />
      )}

      <FilterSheet
        kind={kind}
        visible={sheetOpen}
        value={filters}
        hasLocation={!!coords}
        onClose={() => setSheetOpen(false)}
        onApply={(f) => setFiltersByKind((prev) => ({ ...prev, [kind]: f }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 999, paddingHorizontal: 16 },
  input: { flex: 1, fontSize: 14, height: 46 },
  filterBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
});
