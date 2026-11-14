import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

interface Props {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'brand' | 'ghost' | 'danger';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  accessibilityHint?: string;
}

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, compact, accessibilityHint }: Props) {
  const { colors, radius } = useTheme();
  const palette = {
    primary: { bg: colors.primary, fg: colors.primaryText, border: colors.primary },
    secondary: { bg: colors.surfaceMuted, fg: colors.text, border: colors.surfaceMuted },
    brand: { bg: colors.brand, fg: '#FFFFFF', border: colors.brand },
    ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={[
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderRadius: radius.pill,
          paddingVertical: compact ? 9 : 14,
          paddingHorizontal: compact ? 16 : 22,
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={palette.fg} /> : null}
          <AppText variant="label" weight="semibold" style={{ color: palette.fg }}>
            {title}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
