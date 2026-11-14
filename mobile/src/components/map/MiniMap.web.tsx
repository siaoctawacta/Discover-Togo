import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';
import type { MiniMapProps } from './types';

/** Web fallback for the detail mini-map: a styled coordinate card. */
export const MiniMap = memo(function MiniMap({ location, title, style }: MiniMapProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient colors={[colors.brand, colors.brandDeep]} style={StyleSheet.absoluteFill} />
      <Ionicons name="location" size={30} color="#FFFFFF" />
      <AppText variant="label" weight="semibold" style={{ color: '#FFFFFF' }} numberOfLines={1}>
        {title}
      </AppText>
      <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
      </AppText>
    </View>
  );
});

const styles = StyleSheet.create({ wrap: { height: 160, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 4 } });
