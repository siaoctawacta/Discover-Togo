import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface Props {
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  vertical?: boolean;
}

/** Thin kente / Togolese-flag inspired stripe built from plain Views. Decorative only. */
export const KenteStripe = memo(function KenteStripe({ width = 44, height = 4, style, vertical }: Props) {
  const { colors } = useTheme();
  const blocks = [...colors.kente, colors.kente[0] ?? '#006A4E'];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.row, { width, height, flexDirection: vertical ? 'column' : 'row', borderRadius: Math.min(width, height) / 2 }, style]}
    >
      {blocks.map((c, i) => (
        <View key={i} style={{ flex: i % 2 === 0 ? 2 : 1, backgroundColor: c }} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({ row: { overflow: 'hidden' } });
