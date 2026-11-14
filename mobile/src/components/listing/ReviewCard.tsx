import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Review } from '@/api/types';
import { AppText, SafeImage } from '@/components/ui';
import { formatDate, initials } from '@/lib/format';
import { useTheme } from '@/theme';

export const ReviewCard = memo(function ReviewCard({ review }: { review: Review }) {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.head}>
        {review.author.photoUrl ? (
          <SafeImage uri={review.author.photoUrl} style={styles.avatar} icon="person" />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }]}>
            <AppText variant="caption" weight="bold" style={{ color: '#FFFFFF' }}>
              {initials(review.author.displayName)}
            </AppText>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <AppText variant="label" weight="semibold" numberOfLines={1}>
            {review.author.displayName}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {formatDate(review.createdAt, i18n.language)}
          </AppText>
        </View>
        <View style={styles.stars} accessibilityLabel={`${review.rating}/5`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Ionicons key={n} name={n <= review.rating ? 'star' : 'star-outline'} size={12} color={colors.star} />
          ))}
        </View>
      </View>
      <AppText color="textMuted">{review.comment}</AppText>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 14, gap: 8 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  stars: { flexDirection: 'row', gap: 1 },
});
