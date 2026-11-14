import { memo, useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

export interface TabItem<T extends string> {
  id: T;
  label: string;
}

interface Props<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
}

/** Horizontal text tabs with a short animated underline under the active one (reference style). */
function CategoryTabsInner<T extends string>({ items, value, onChange }: Props<T>) {
  const { colors, spacing } = useTheme();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const active = layouts[value];
  const indicator = useAnimatedStyle(() => ({
    opacity: active ? 1 : 0,
    transform: [{ translateX: withTiming(active?.x ?? 0, { duration: 220 }) }],
  }));
  const onLayout = useCallback((id: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => (prev[id]?.x === x && prev[id]?.width === width ? prev : { ...prev, [id]: { x, width } }));
  }, []);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.xl }} accessibilityRole="tablist">
      <View>
        <View style={styles.row}>
          {items.map((item) => {
            const selected = item.id === value;
            return (
              <Pressable
                key={item.id}
                onLayout={onLayout(item.id)}
                onPress={() => onChange(item.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                style={styles.tab}
              >
                <AppText variant="subheading" weight={selected ? 'semibold' : 'regular'} color={selected ? 'text' : 'textMuted'}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Animated.View style={[styles.indicator, { backgroundColor: colors.text }, indicator]} />
      </View>
    </ScrollView>
  );
}

export const CategoryTabs = memo(CategoryTabsInner) as typeof CategoryTabsInner;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 26, paddingTop: 10 },
  tab: { paddingBottom: 10 },
  indicator: { position: 'absolute', top: 0, left: 0, width: 26, height: 3, borderRadius: 2 },
});
