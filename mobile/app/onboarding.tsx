import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TerraceBackdrop } from '@/components/onboarding/TerraceBackdrop';
import { SwipeUpGo } from '@/components/onboarding/SwipeUpGo';
import { AppText } from '@/components/ui';
import { Image } from 'expo-image';
import { useHome } from '@/hooks/useHome';
import { usePrefs } from '@/store/prefs';

export default function Onboarding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const complete = usePrefs((s) => s.completeOnboarding);
  // Also prefetches the home dashboard while the user reads the intro.
  const { data } = useHome();
  const photo = data?.hero[0]?.coverImage;

  const onGo = useCallback(() => {
    complete();
    router.replace('/(tabs)');
  }, [complete]);

  return (
    <View style={styles.root}>
      <TerraceBackdrop />
      {photo && photo.startsWith('https://') ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} cachePolicy="memory-disk" />
      ) : null}
      <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + 110 }]}>
        <Animated.View entering={FadeInDown.duration(700)}>
          <AppText variant="display" align="center" style={styles.title}>
            {t('onboarding.title')}
          </AppText>
          <AppText variant="body" weight="medium" align="center" style={styles.subtitle}>
            {t('onboarding.subtitle')}
          </AppText>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInUp.delay(300).duration(700)} style={[styles.bottom, { paddingBottom: insets.bottom + 48 }]}>
        <SwipeUpGo label={t('onboarding.go')} onComplete={onGo} accessibilityHint={t('onboarding.swipeHint')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2F4A2A' },
  content: { paddingHorizontal: 36 },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 38, textShadowColor: 'rgba(0,0,0,0.25)', textShadowRadius: 8 },
  subtitle: { color: 'rgba(255,255,255,0.92)', marginTop: 8 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
});
