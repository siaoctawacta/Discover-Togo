import { type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Lightweight bottom-sheet-like modal (slide up, dimmed backdrop, grabber). */
export function BottomSheet({ visible, onClose, title, children, footer }: Props) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="close" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.md }]} accessibilityViewIsModal>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          <View style={[styles.header, { paddingHorizontal: spacing.xl }]}>
            <AppText variant="heading" style={{ flex: 1 }} accessibilityRole="header">
              {title}
            </AppText>
            <IconButton icon="close" onPress={onClose} accessibilityLabel="close" size={36} />
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, gap: spacing.lg }}>{children}</ScrollView>
          {footer ? <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.sm }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', width: '100%', maxWidth: 640, alignSelf: 'center' },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginTop: 10, marginBottom: 6 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
});
