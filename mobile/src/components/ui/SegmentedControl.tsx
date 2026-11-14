import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

interface Props<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surfaceMuted }]} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            style={[styles.item, selected && { backgroundColor: colors.primary }]}
          >
            <AppText variant="label" weight={selected ? 'semibold' : 'medium'} style={{ color: selected ? colors.primaryText : colors.textMuted }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 999, padding: 4 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 999 },
});
