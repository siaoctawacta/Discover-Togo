import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export const Chip = memo(function Chip({ label, selected, onPress }: Props) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surfaceMuted,
          borderColor: selected ? colors.primary : colors.surfaceMuted,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <AppText variant="label" style={{ color: selected ? colors.primaryText : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
