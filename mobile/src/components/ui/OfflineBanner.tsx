import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useIsOnline } from '@/hooks/useNetwork';
import { useTheme } from '@/theme';
import { AppText } from './AppText';

export function OfflineBanner() {
  const online = useIsOnline();
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (online) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={[styles.banner, { backgroundColor: colors.brandDeep }]}>
        <Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" />
        <AppText variant="caption" weight="medium" style={{ color: '#FFFFFF' }}>
          {t('offline.banner')}
        </AppText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
});
