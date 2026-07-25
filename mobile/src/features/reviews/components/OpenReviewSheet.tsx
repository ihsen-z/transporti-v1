import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { StarRating } from '@/shared/ui/StarRating';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { useCreateReview } from '../api/useCreateReview';

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

  const serverError = create.error
    ? t(`reviews.errors.${create.error.kind}`)
    : null;

  return (
    <Modal visible={jobId !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {create.isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{t('reviews.success')}</Text>
              <Button label={t('common.close')} onPress={close} variant="primary" />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('reviews.rate_title')}</Text>
              <View style={styles.stars}>
                <Text style={styles.label}>{t('reviews.rate_label')}</Text>
                <StarRating value={rating || null} onChange={setRating} size={36} />
              </View>
              <View>
                <Text style={styles.label}>{t('reviews.comment_label')}</Text>
                <TextInput
                  style={styles.textarea}
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t('reviews.comment_ph')}
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                />
              </View>
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
              <Button
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
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  stars: { gap: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700], marginBottom: spacing.xs },
  textarea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.neutral[900],
    textAlignVertical: 'top',
  },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.green[700], textAlign: 'center' },
});
