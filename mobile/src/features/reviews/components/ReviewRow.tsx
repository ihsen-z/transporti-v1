import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { StarRating } from '@/shared/ui/StarRating';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { ReviewDto } from '../api/dto';

export function ReviewRow({ review }: { review: ReviewDto }) {
  const { t } = useTranslation();
  // Double-aveugle : masqué tant que l'autre partie n'a pas noté.
  const masked = !review.is_revealed || review.rating === null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name} numberOfLines={1}>{review.reviewer_name}</Text>
        <StarRating value={masked ? null : review.rating} size={18} />
      </View>
      {masked ? (
        <Text style={styles.masked}>{t('reviews.masked')}</Text>
      ) : review.comment ? (
        <Text style={styles.comment}>{review.comment}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  masked: { fontSize: fontSize.sm, color: colors.neutral[400], fontStyle: 'italic' },
  comment: { fontSize: fontSize.sm, color: colors.neutral[700] },
});
