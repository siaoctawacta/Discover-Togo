import { useEffect } from 'react';
import { View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme';

interface Props {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = 10, style }: Props) {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      accessibilityElementsHidden
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeleton }, animated, style]}
    />
  );
}

/** Skeleton for a list row (matches ListingRow height). */
export function RowSkeleton() {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }}>
      <Skeleton width={84} height={84} radius={20} />
      <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Loading">
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}
