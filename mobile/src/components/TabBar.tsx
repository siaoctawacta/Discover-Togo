import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

export const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  explore: { active: 'compass', inactive: 'compass-outline' },
  map: { active: 'map', inactive: 'map-outline' },
  saved: { active: 'heart', inactive: 'heart-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

const TabButton = memo(function TabButton({ focused, icon, label, onPress, onLongPress }: { focused: boolean; icon: { active: IconName; inactive: IconName }; label: string; onPress: () => void; onLongPress: () => void }) {
  const { colors } = useTheme();
  const scale = useSharedValue(focused ? 1 : 0.8);
  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.8, { damping: 14, stiffness: 180 });
  }, [focused, scale]);
  const bubble = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={styles.item}
      hitSlop={6}
    >
      <Animated.View style={[styles.bubble, focused && { backgroundColor: colors.tabActiveBg }, bubble]}>
        <Ionicons name={focused ? icon.active : icon.inactive} size={22} color={focused ? colors.tabActiveIcon : colors.tabInactiveIcon} />
      </Animated.View>
    </Pressable>
  );
});

/** Reference-style tab bar: light grey bar, active tab = filled black circle with white icon. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.tabBar, paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {state.routes.map((route, index) => {
        const focused = index === state.index;
        const options = descriptors[route.key]?.options;
        const label = typeof options?.title === 'string' ? options.title : route.name;
        const icon = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
        return (
          <TabButton
            key={route.key}
            focused={focused}
            icon={icon}
            label={label}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 10, paddingHorizontal: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
