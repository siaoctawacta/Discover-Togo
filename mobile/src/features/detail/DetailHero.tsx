import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Listing } from '@/api/types';
import { AppText, IconButton, SafeImage, SponsoredBadge } from '@/components/ui';
import { goBackOr } from '@/components/ui/ScreenHeader';
import { kindIcon } from '@/lib/navigation';
import { useTheme } from '@/theme';

export const HERO_HEIGHT = 400;
const THUMB = 58;

interface Props {
  listing: Listing;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

/** Hero photo with rounded bottom-left corner, glass buttons, title overlay and vertical thumbnail strip. */
export const DetailHero = memo(function DetailHero({ listing, isFavorite, onToggleFavorite }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const gallery = useMemo(() => {
    const urls = [listing.coverImage, ...listing.images.map((i) => i.url)].filter(Boolean);
    return [...new Set(urls)].slice(0, 8);
  }, [listing]);
  const [selected, setSelected] = useState(0);
  const current = gallery[selected] ?? listing.coverImage;
  const altFor = (url: string) => listing.images.find((i) => i.url === url)?.alt ?? listing.name;

  return (
    <View style={{ height: HERO_HEIGHT + THUMB / 2 }}>
      <View style={[styles.hero, { height: HERO_HEIGHT, backgroundColor: colors.brandDeep }]}>
        <Animated.View key={current} entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
          <SafeImage uri={current} icon={kindIcon(listing.kind)} style={StyleSheet.absoluteFill} priority="high" accessibilityLabel={altFor(current)} />
        </Animated.View>
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'transparent', 'rgba(0,0,0,0.55)']} style={StyleSheet.absoluteFill} />
        <View style={[styles.topRow, { top: insets.top + 8 }]}>
          <IconButton icon="chevron-back" variant="glass" onPress={() => goBackOr()} accessibilityLabel={t('common.back')} size={44} />
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            variant="glass"
            iconColor={isFavorite ? '#FF5A6E' : '#FFFFFF'}
            onPress={onToggleFavorite}
            accessibilityLabel={isFavorite ? t('detail.unfavorite') : t('detail.favorite')}
            size={44}
          />
        </View>
        <View style={styles.titleBlock}>
          {listing.sponsored ? <SponsoredBadge style={{ alignSelf: 'flex-start', marginBottom: 8 }} /> : null}
          <AppText variant="display" weight="medium" style={styles.title} numberOfLines={2}>
            {listing.name}
          </AppText>
          <View style={styles.loc}>
            <Ionicons name="location" size={14} color="#FFFFFF" />
            <AppText variant="label" style={{ color: 'rgba(255,255,255,0.92)' }} numberOfLines={1}>
              {listing.city}, {t(`regions.${listing.region}`)}
            </AppText>
          </View>
        </View>
      </View>

      {gallery.length > 1 ? (
        <View style={[styles.strip, { top: HERO_HEIGHT - Math.min(gallery.length, 4) * (THUMB + 16) + THUMB / 2 }]} accessibilityRole="tablist">
          {gallery.slice(0, 4).map((url, i) => (
            <Pressable
              key={url}
              onPress={() => setSelected(i)}
              accessibilityRole="tab"
              accessibilityLabel={altFor(url)}
              accessibilityState={{ selected: i === selected }}
              style={[styles.thumbWrap, { borderColor: i === selected ? '#FFFFFF' : 'rgba(255,255,255,0.65)', borderWidth: i === selected ? 3 : 2 }]}
            >
              <SafeImage uri={url} style={styles.thumb} transition={100} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  hero: { borderBottomLeftRadius: 72, borderBottomRightRadius: 0, overflow: 'hidden' },
  topRow: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  titleBlock: { position: 'absolute', left: 28, right: 100, bottom: 38 },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 38 },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  strip: { position: 'absolute', right: 14, gap: 10 },
  thumbWrap: { width: THUMB + 6, height: THUMB + 6, borderRadius: 18, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  thumb: { flex: 1, borderRadius: 15 },
});
