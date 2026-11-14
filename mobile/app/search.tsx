import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, SectionList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Listing } from '@/api/types';
import { ListingRow, LISTING_ROW_HEIGHT } from '@/components/listing/ListingRow';
import { AppText, EmptyState, ErrorState, IconButton, ListSkeleton, OfflineBanner, goBackOr } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearch } from '@/hooks/useSearch';
import { listingHref } from '@/lib/navigation';
import { usePrefs } from '@/store/prefs';
import { useTheme } from '@/theme';
import { noWebOutline } from '@/theme/web';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { colors, spacing, fonts } = useTheme();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const q = useDebouncedValue(text, 300).trim();
  const search = useSearch(q);
  const recent = usePrefs((s) => s.recentSearches);
  const addRecent = usePrefs((s) => s.addRecentSearch);
  const removeRecent = usePrefs((s) => s.removeRecentSearch);
  const clearRecent = usePrefs((s) => s.clearRecentSearches);

  const sections = useMemo(() => {
    const r = search.data?.results;
    if (!r) return [];
    return [
      { key: 'places', title: t('kinds.placePlural'), data: r.places },
      { key: 'restaurants', title: t('kinds.restaurantPlural'), data: r.restaurants },
      { key: 'hotels', title: t('kinds.hotelPlural'), data: r.hotels },
    ].filter((s) => s.data.length > 0);
  }, [search.data, t]);

  const openResult = useCallback(
    (l: Listing) => {
      addRecent(q);
      router.push(listingHref(l));
    },
    [addRecent, q],
  );
  const renderItem = useCallback(({ item }: { item: Listing }) => <ListingRow listing={item} onPress={openResult} />, [openResult]);

  const showRecent = q.length < 2;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <OfflineBanner />
      <View style={[styles.bar, { paddingHorizontal: spacing.xl, paddingVertical: spacing.md }]}>
        <IconButton icon="chevron-back" onPress={() => goBackOr()} accessibilityLabel={t('common.back')} />
        <View style={[styles.input, { backgroundColor: colors.surfaceMuted }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            autoFocus
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => addRecent(text)}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            returnKeyType="search"
            maxLength={80}
            autoCorrect={false}
            style={[{ flex: 1, color: colors.text, fontFamily: fonts.regular, fontSize: 15, height: 46 }, noWebOutline]}
            accessibilityLabel={t('common.search')}
          />
          {text ? (
            <Pressable onPress={() => setText('')} hitSlop={10} accessibilityLabel={t('common.clear')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {showRecent ? (
        <View style={{ paddingHorizontal: spacing.xl, gap: spacing.sm }}>
          <View style={styles.recentHead}>
            <AppText variant="heading">{t('search.recent')}</AppText>
            {recent.length ? (
              <Pressable onPress={clearRecent} hitSlop={8} accessibilityRole="button">
                <AppText variant="label" color="accent">
                  {t('common.clear')}
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {recent.length === 0 ? (
            <AppText color="textMuted">{t('search.noRecent')}</AppText>
          ) : (
            recent.map((r) => (
              <View key={r} style={styles.recentRow}>
                <Pressable onPress={() => setText(r)} style={styles.recentText} accessibilityRole="button">
                  <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  <AppText numberOfLines={1}>{r}</AppText>
                </Pressable>
                <Pressable onPress={() => removeRecent(r)} hitSlop={10} accessibilityLabel={t('common.remove')}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : search.isLoading ? (
        <ListSkeleton count={5} />
      ) : search.isError && !search.data ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(l) => `${l.kind}-${l.id}`}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <AppText variant="subheading" color="textMuted" style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, backgroundColor: colors.background }}>
              {section.title} · {section.data.length}
            </AppText>
          )}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          windowSize={9}
          ListEmptyComponent={<EmptyState icon="search-outline" title={t('search.noResults', { q })} message={t('search.noResultsHint')} />}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing.xxl }}
          style={{ minHeight: LISTING_ROW_HEIGHT }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 999, paddingHorizontal: 16 },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  recentText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
