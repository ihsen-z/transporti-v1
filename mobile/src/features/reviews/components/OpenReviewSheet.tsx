import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { StarRating } from '@/shared/ui/StarRating';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { useCreateReview } from '../api/useCreateReview';
import { Txt } from '@/shared/ui/Txt';
import { useSheetBottomPadding } from '@/shared/ui/useSheetBottomPadding';

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function OpenReviewSheet({ jobId, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateReview();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = () => {
    if (!jobId) return;
    if (rating < 1) {
      setFormError(t('reviews.errors.rating_required'));
      return;
    }
    setFormError(null);
    create.mutate({ job_id: jobId, rating, comment: comment.trim() });
  };

  const close = () => {
    setRating(0);
    setComment('');
    setFormError(null);
    create.reset();
    onClose();
  };

  // Les trois refus connus (déjà noté, mission non terminée,
  // non-participant) gardent leur message localisé, plus clair que le
  // texte serveur ; `serverMessage` ne remonte que sur un refus non classé.
  const serverError = create.error
    ? (create.error.kind === 'unknown'
        ? (create.error.serverMessage ?? t('reviews.errors.unknown'))
        : t(`reviews.errors.${create.error.kind}`))
    : null;

  // Bord à bord Android 16 : la feuille ne colle pas la barre de gestes.
  const sheetPadding = useSheetBottomPadding(spacing.xl);

  return (
    <Modal visible={jobId !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { paddingBottom: sheetPadding }]} onPress={() => undefined}>
          {create.isSuccess ? (
            <View style={styles.successBox}>
              <Txt style={styles.successText}>{t('reviews.success')}</Txt>
              <Button
                testID="open-review-close"
                label={t('common.close')}
                onPress={close}
                variant="primary"
              />
            </View>
          ) : (
            <>
              <Txt style={styles.title}>{t('reviews.rate_title')}</Txt>
              <View style={styles.stars}>
                <Txt style={styles.label}>{t('reviews.rate_label')}</Txt>
                <StarRating
                  testID="open-review-rating"
                  value={rating || null}
                  onChange={setRating}
                  size={36}
                />
              </View>
              <View>
                <Txt style={styles.label}>{t('reviews.comment_label')}</Txt>
                <TextInput
                  testID="open-review-comment"
                  accessibilityLabel={t('reviews.comment_label')}
                  style={styles.textarea}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('reviews.comment_ph')}
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                />
              </View>
              {formError ? (
                <Txt testID="open-review-form-error" style={styles.error}>
                  {formError}
                </Txt>
              ) : null}
              {serverError ? (
                <Txt testID="open-review-server-error" style={styles.error}>
                  {serverError}
                </Txt>
              ) : null}
              <Button
                testID="open-review-submit"
                label={t('reviews.submit')}
                onPress={submit}
                variant="cta"
                loading={create.isPending}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  stars: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700], marginBottom: spacing.xs },
  // Champ de la charte (.field) : fond `bg-app`, liseré discret, rayon 14.
  textarea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radii.input,
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    textAlignVertical: 'top',
  },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text.green, textAlign: 'center' },
});
