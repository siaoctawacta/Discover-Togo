import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import type { Listing } from '@/api/types';
import { AppText, KenteStripe, PressableScale, SafeImage } from '@/components/ui';
import { listingHref } from '@/lib/navigation';
import { useTheme } from '@/theme';

const HEIGHT = 190;

/** Paged hero carousel ("Togo at a glance"). */
export const HeroCarousel = memo(function HeroCarousel({ items }: { items: Listing[] }) {
  const { width: screen } = useWindowDimensions();
  const { spacing, colors } = useTheme();
  const width = Math.min(screen, 640) - spacing.xl * 2;
  const [index, setIndex] = useState(0);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / (width + spacing.md));
      if (i !== index) setIndex(i);
    },
    [index, width, spacing.md],
  );

  const renderItem = useCallback(
    ({ item }: { item: Listing }) => (
      <PressableScale onPress={() => router.push(listingHref(item))} accessibilityRole="button" accessibilityLabel={item.name} style={{ width, height: HEIGHT }}>
        <SafeImage uri={item.coverImage} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} priority="high" />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={[StyleSheet.absoluteFill, { borderRadius: 28 }]} />
        <View style={styles.caption}>
          <KenteStripe width={40} height={3} style={{ marginBottom: 6 }} />
          <AppText variant="heading" style={{ color: '#FFFFFF' }} numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }} numberOfLines={1}>
            {item.city}, Togo
          </AppText>
        </View>
      </PressableScale>
    ),
    [width],
  );

  if (!items.length) return null;
  return (
    <View>
      <FlatList
        data={items}
        horizontal
        keyExtractor={(l) => l.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + spacing.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: spacing.xl, gap: spacing.md }}
        onScroll={onScroll}
        scrollEventThrottle={32}
        getItemLayout={(_, i) => ({ length: width + spacing.md, offset: (width + spacing.md) * i, index: i })}
      />
      <View style={styles.dots}>
        {items.map((l, i) => (
          <View key={l.id} style={[styles.dot, { backgroundColor: i === index ? colors.text : colors.border, width: i === index ? 18 : 6 }]} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  caption: { position: 'absolute', left: 20, right: 20, bottom: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginTop: 10 },
  dot: { height: 6, borderRadius: 3 },
});
