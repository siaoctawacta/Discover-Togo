import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { isApiError } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { AppText, Button, EmptyState, ScreenHeader, TextField, errorMessageKey } from '@/components/ui';
import { useCreateReview } from '@/hooks/useReviews';
import { firstParam, isObjectId, REVIEW_MAX, REVIEW_MIN, validateReview } from '@/lib/validators';
import { useTheme } from '@/theme';

export default function WriteReviewScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string }>();
  const id = firstParam(params.id);
  const name = (firstParam(params.name) ?? '').slice(0, 80);
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { status } = useAuth();
  const valid = isObjectId(id);

  if (!valid) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t('reviews.write')} />
        <EmptyState icon="alert-circle-outline" title={t('errors.invalidLink')} />
      </View>
    );
  }
  if (status !== 'signedIn') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t('reviews.write')} />
        <EmptyState
          icon="lock-closed-outline"
          title={t('auth.requiredTitle')}
          message={t('auth.requiredReview')}
          actionLabel={t('auth.login')}
          onAction={() => router.push({ pathname: '/auth/login', params: { reason: 'review' } })}
        />
      </View>
    );
  }
  return <ReviewForm listingId={id} name={name} spacing={spacing.xl} />;
}

function ReviewForm({ listingId, name, spacing }: { listingId: string; name: string; spacing: number }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mutation = useCreateReview(listingId);
  const errors = validateReview(rating, comment);
  const hasErrors = !!errors.rating || !!errors.comment;

  const submit = () => {
    setTouched(true);
    if (hasErrors) return;
    mutation.mutate({ rating, comment: comment.trim() }, { onSuccess: () => setSubmitted(true) });
  };

  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title={t('reviews.write')} />
        <EmptyState icon="checkmark-circle-outline" title={t('reviews.thanks')} message={t('reviews.pendingModeration')} actionLabel={t('common.done')} onAction={() => router.back()} />
      </View>
    );
  }

  const serverError = mutation.error
    ? isApiError(mutation.error) && mutation.error.code === 'CONFLICT'
      ? t('reviews.alreadyReviewed')
      : t(errorMessageKey(mutation.error))
    : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title={t('reviews.write')} />
      <ScrollView contentContainerStyle={{ padding: spacing, gap: 20 }} keyboardShouldPersistTaps="handled">
        {name ? (
          <AppText variant="heading" numberOfLines={2}>
            {name}
          </AppText>
        ) : null}
        <View style={{ gap: 8 }}>
          <AppText variant="label" color="textMuted">
            {t('reviews.yourRating')}
          </AppText>
          <View style={styles.stars} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: 5, now: rating }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} accessibilityRole="button" accessibilityLabel={`${n}/5`} hitSlop={6}>
                <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={36} color={colors.star} />
              </Pressable>
            ))}
          </View>
          {touched && errors.rating ? (
            <AppText variant="caption" color="danger">
              {t(errors.rating)}
            </AppText>
          ) : null}
        </View>
        <TextField
          label={t('reviews.yourReview')}
          value={comment}
          onChangeText={(v) => setComment(v.slice(0, REVIEW_MAX))}
          multiline
          maxLength={REVIEW_MAX}
          placeholder={t('reviews.placeholder')}
          error={touched && errors.comment ? t(errors.comment, { min: REVIEW_MIN, max: REVIEW_MAX }) : null}
          hint={`${comment.trim().length}/${REVIEW_MAX}`}
        />
        {serverError ? (
          <AppText color="danger" accessibilityLiveRegion="polite">
            {serverError}
          </AppText>
        ) : null}
        <Button title={t('reviews.submit')} onPress={submit} loading={mutation.isPending} disabled={touched && hasErrors} />
        <AppText variant="caption" color="textMuted" align="center">
          {t('reviews.moderationNote')}
        </AppText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ stars: { flexDirection: 'row', gap: 8 } });
