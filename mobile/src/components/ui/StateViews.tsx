import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { isApiError } from '@/api/errors';
import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface EmptyProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'leaf-outline', title, message, actionLabel, onAction }: EmptyProps) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.wrap, { padding: spacing.xxl }]}>
      <View style={[styles.iconCircle, { backgroundColor: colors.surfaceMuted }]}>
        <Ionicons name={icon} size={30} color={colors.brand} />
      </View>
      <AppText variant="heading" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText color="textMuted" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} compact style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}

export function errorMessageKey(error: unknown): string {
  if (!isApiError(error)) return 'errors.generic';
  if (error.isNetwork) return 'errors.network';
  switch (error.code) {
    case 'NOT_FOUND':
      return 'errors.notFound';
    case 'UNAUTHENTICATED':
      return 'errors.unauthenticated';
    case 'FORBIDDEN':
      return 'errors.forbidden';
    case 'RATE_LIMITED':
      return 'errors.rateLimited';
    case 'CONFLICT':
      return 'errors.conflict';
    case 'VALIDATION_ERROR':
      return 'errors.validation';
    default:
      return 'errors.generic';
  }
}

export function ErrorState({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  const offline = isApiError(error) && error.isNetwork;
  return (
    <EmptyState
      icon={offline ? 'cloud-offline-outline' : 'alert-circle-outline'}
      title={t(offline ? 'errors.offlineTitle' : 'errors.title')}
      message={t(errorMessageKey(error))}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 10, flexGrow: 1 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
