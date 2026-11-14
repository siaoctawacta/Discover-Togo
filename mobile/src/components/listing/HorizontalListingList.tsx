import { memo, useCallback } from 'react';
import { FlatList, View } from 'react-native';
import type { Listing } from '@/api/types';
import { Skeleton } from '@/components/ui';
import { useTheme } from '@/theme';
import { COMPACT_CARD_WIDTH, ListingCardCompact } from './ListingCardCompact';
import { ListingCardTall, TALL_CARD_HEIGHT, TALL_CARD_WIDTH } from './ListingCardTall';

interface Props {
  items: Listing[] | undefined;
  loading?: boolean;
  variant?: 'tall' | 'medium' | 'compact';
}

const SIZES = {
  tall: { w: TALL_CARD_WIDTH, h: TALL_CARD_HEIGHT },
  medium: { w: 168, h: 220 },
  compact: { w: COMPACT_CARD_WIDTH, h: 60 },
};

export const HorizontalListingList = memo(function HorizontalListingList({ items, loading, variant = 'tall' }: Props) {
  const { spacing } = useTheme();
  const size = SIZES[variant];
  const gap = variant === 'compact' ? spacing.md : spacing.lg;
  const renderItem = useCallback(
    ({ item }: { item: Listing }) =>
      variant === 'compact' ? <ListingCardCompact listing={item} /> : <ListingCardTall listing={item} width={size.w} height={size.h} />,
    [variant, size.w, size.h],
  );
  if (loading && !items?.length) {
    return (
      <View style={{ flexDirection: 'row', gap, paddingHorizontal: spacing.xl }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={size.w} height={size.h} radius={variant === 'compact' ? 20 : 28} />
        ))}
      </View>
    );
  }
  return (
    <FlatList
      data={items ?? []}
      horizontal
      keyExtractor={(l) => l.id}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, gap }}
      initialNumToRender={4}
      windowSize={5}
      getItemLayout={(_, i) => ({ length: size.w + gap, offset: (size.w + gap) * i, index: i })}
    />
  );
});
