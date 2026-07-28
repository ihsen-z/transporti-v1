import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StarRating } from '@/shared/ui/StarRating';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { ReviewDto } from '../api/dto';

export function ReviewRow({ review }: { review: ReviewDto }) {
  const { t } = useTranslation();
  // Double-aveugle : masqué tant que l'autre partie n'a pas noté.
  const masked = !review.is_revealed || review.rating === null;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Avatar name={review.reviewer_name} size={38} />
        <Text style={styles.name} numberOfLines={1}>{review.reviewer_name}</Text>
        <StarRating value={masked ? null : review.rating} size={18} />
      </View>
      {masked ? (
        <Text style={styles.masked}>{t('reviews.masked')}</Text>
      ) : review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  name: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  masked: { fontSize: fontSize.sm, color: colors.neutral[400], fontStyle: 'italic', marginTop: spacing.sm },
  comment: { fontSize: fontSize.sm, color: colors.neutral[700], marginTop: spacing.sm },
});
