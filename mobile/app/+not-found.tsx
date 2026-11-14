import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';

export default function NotFound() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <EmptyState icon="compass-outline" title={t('errors.notFound')} actionLabel={t('common.goHome')} onAction={() => router.replace('/')} />
    </View>
  );
}
