import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

interface Props {
  icon: IconName;
  onPress?: () => void;
  accessibilityLabel: string;
  variant?: 'outline' | 'glass' | 'solid' | 'muted';
  size?: number;
  iconColor?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function IconButton({ icon, onPress, accessibilityLabel, variant = 'outline', size = 40, iconColor, style, disabled }: Props) {
  const { colors } = useTheme();
  const bg =
    variant === 'glass' ? colors.glass : variant === 'solid' ? colors.primary : variant === 'muted' ? colors.surfaceMuted : 'transparent';
  const fg = iconColor ?? (variant === 'glass' ? '#FFFFFF' : variant === 'solid' ? colors.primaryText : colors.text);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor: variant === 'outline' ? colors.border : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.45)} color={fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
