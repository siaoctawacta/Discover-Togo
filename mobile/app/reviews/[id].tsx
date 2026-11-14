import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, View } from 'react-native';
import type { Review } from '@/api/types';
import { ReviewCard } from '@/components/listing/ReviewCard';
import { Button, EmptyState, ErrorState, ListSkeleton, ScreenHeader } from '@/components/ui';
import { useReviews } from '@/hooks/useReviews';
import { firstParam, isObjectId } from '@/lib/validators';
import { useTheme } from '@/theme';

const renderItem = ({ item }: { item: Review }) => <ReviewCard review={item} />;

export default function ReviewsScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = firstParam(params.id);
  const name = (firstParam(params.name) ?? '').slice(0, 80);
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const valid = isObjectId(id);
  const reviews = useReviews(valid ? id : undefined, 20);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reviews.refetch().catch(() => undefined);
    setRefreshing(false);
  }, [reviews]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={name || t('detail.reviews')} />
      {!valid ? (
        <EmptyState icon="alert-circle-outline" title={t('errors.invalidLink')} />
      ) : reviews.isLoading ? (
        <ListSkeleton count={4} />
      ) : reviews.isError && !reviews.data ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} />
      ) : (
        <FlatList
          data={reviews.data?.items ?? []}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.xl, gap: spacing.md, flexGrow: 1 }}
          onEndReached={() => reviews.hasNextPage && !reviews.isFetchingNextPage && void reviews.fetchNextPage()}
          onEndReachedThreshold={0.5}
          windowSize={9}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
          ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title={t('reviews.empty')} message={t('reviews.beFirst')} />}
          ListFooterComponent={
            <Button
              title={t('reviews.write')}
              icon="create-outline"
              onPress={() => router.push({ pathname: '/reviews/write/[id]', params: { id: id as string, name } })}
              style={{ marginTop: spacing.md }}
            />
          }
        />
      )}
    </View>
  );
}
