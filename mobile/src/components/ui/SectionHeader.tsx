import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { KenteStripe } from './KenteStripe';

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Render the round "•••" button like the reference instead of a text link */
  moreButton?: boolean;
}

export function SectionHeader({ title, actionLabel, onAction, moreButton }: Props) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: spacing.xl, marginBottom: spacing.md }]}>
      <View style={{ flex: 1 }}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        <KenteStripe width={36} height={3} style={{ marginTop: 4 }} />
      </View>
      {onAction ? (
        moreButton ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel ?? title}
            hitSlop={8}
            style={[styles.more, { backgroundColor: colors.surfaceMuted }]}
          >
            <AppText weight="bold" style={{ letterSpacing: 1, marginTop: -6 }}>
              •••
            </AppText>
          </Pressable>
        ) : (
          <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}>
            <AppText variant="label" color="accent" weight="semibold">
              {actionLabel}
            </AppText>
          </Pressable>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  more: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
