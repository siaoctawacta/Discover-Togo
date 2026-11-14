import { router } from 'expo-router';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface Props {
  title: string;
  back?: boolean;
  right?: ReactNode;
  large?: boolean;
}

export function goBackOr(fallback: '/' = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

export function ScreenHeader({ title, back = true, right, large }: Props) {
  const { spacing, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <View style={[styles.row, { paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.md, backgroundColor: colors.background }]}>
      {back ? <IconButton icon="chevron-back" onPress={() => goBackOr()} accessibilityLabel={t('common.back')} /> : null}
      <AppText variant={large ? 'title' : 'heading'} style={{ flex: 1 }} numberOfLines={1} accessibilityRole="header">
        {title}
      </AppText>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 } });
