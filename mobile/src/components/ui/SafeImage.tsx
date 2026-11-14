import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageStyle } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  priority?: 'low' | 'normal' | 'high';
  transition?: number;
}

function isHttpsUrl(u: string | null | undefined): u is string {
  return typeof u === 'string' && /^https:\/\/[^\s]+$/i.test(u);
}

/**
 * expo-image with disk+memory caching and a branded fallback (green gradient + icon)
 * when the URL is missing, non-https, or fails to load.
 */
export const SafeImage = memo(function SafeImage({ uri, style, imageStyle, accessibilityLabel, icon = 'leaf-outline', priority = 'normal', transition = 250 }: Props) {
  const { colors } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = isHttpsUrl(uri) && failedUri !== uri;
  return (
    <View style={[styles.wrap, style]} accessible={!!accessibilityLabel} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <LinearGradient colors={[colors.brand, colors.brandDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
        <View style={styles.center}>
          <Ionicons name={icon} size={28} color="rgba(255,255,255,0.55)" />
        </View>
      </LinearGradient>
      {showImage ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFill, imageStyle]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={transition}
          priority={priority}
          recyclingKey={uri}
          onError={() => setFailedUri(uri)}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
