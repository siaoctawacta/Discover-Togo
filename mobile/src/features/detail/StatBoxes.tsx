import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useTheme } from '@/theme';

export interface Stat {
  label: string;
  value: string;
  onPress?: () => void;
  accessibilityHint?: string;
}

/** Three outlined stat boxes; label grey, value teal (reference "Distance / Temp / Rating"). */
export const StatBoxes = memo(function StatBoxes({ stats }: { stats: Stat[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {stats.map((s) => (
        <Pressable
          key={s.label}
          onPress={s.onPress}
          disabled={!s.onPress}
          accessibilityRole={s.onPress ? 'button' : 'text'}
          accessibilityLabel={`${s.label}: ${s.value}`}
          accessibilityHint={s.accessibilityHint}
          style={[styles.box, { borderColor: colors.border, backgroundColor: colors.surface }]}
        >
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {s.label}
          </AppText>
          <AppText variant="heading" weight="semibold" color="accent" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {s.value}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  box: { flex: 1, borderWidth: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center', gap: 4 },
});
