import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { AppText, IconButton, KenteStripe, goBackOr } from '@/components/ui';
import { useTheme } from '@/theme';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.md, gap: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <IconButton icon="close" onPress={() => goBackOr()} accessibilityLabel={t('common.close')} />
        <View style={{ gap: 6, marginTop: spacing.md }}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          <KenteStripe width={56} height={4} />
          {subtitle ? (
            <AppText color="textMuted" style={{ marginTop: 6 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ body: { gap: 14 } });
