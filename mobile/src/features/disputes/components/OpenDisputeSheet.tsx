import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { DisputeReason } from '../api/dto';
import { useCreateDispute } from '../api/useCreateDispute';
import { Txt } from '@/shared/ui/Txt';
import { useSheetBottomPadding } from '@/shared/ui/useSheetBottomPadding';

const REASONS: readonly DisputeReason[] = [
  'DAMAGED_ITEMS',
  'NO_SHOW',
  'PAYMENT_ISSUE',
  'LATE_DELIVERY',
  'HARASSMENT',
  'FRAUD',
  'OTHER',
];

interface Props {
  jobId: number | null;
  onClose: () => void;
}

export function OpenDisputeSheet({ jobId, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateDispute();
  const [reason, setReason] = useState<DisputeReason | null>(null);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const reasonOptions = useMemo(
    () => REASONS.map((r) => ({ value: r, label: t(`disputes.reason.${r}`) })),
    [t],
  );

  const submit = () => {
    if (!jobId) return;
    if (!reason) {
      setFormError(t('disputes.errors.reason_required'));
      return;
    }
    if (description.trim().length < 20) {
      setFormError(t('disputes.errors.min_desc'));
      return;
    }
    setFormError(null);
    create.mutate({ job_id: jobId, reason, description: description.trim() });
  };

  const close = () => {
    setReason(null);
    setDescription('');
    setFormError(null);
    create.reset();
    onClose();
  };

  // Texte du serveur d'abord (il nomme la cause exacte du refus), message
  // localisé en repli.
  const serverError = create.error
    ? (create.error.serverMessage ??
       t(`disputes.errors.${create.error.kind === 'forbidden' ? 'forbidden' : create.error.kind === 'network' ? 'network' : 'validation'}`))
    : null;

  // Bord à bord Android 16 : la feuille ne colle pas la barre de gestes.
  const sheetPadding = useSheetBottomPadding(spacing.xl);

  return (
    <Modal visible={jobId !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={[styles.sheet, { paddingBottom: sheetPadding }]} onPress={() => undefined}>
          {create.isSuccess ? (
            <View style={styles.successBox}>
              <Txt style={styles.successText}>{t('disputes.success')}</Txt>
              <Button
                testID="open-dispute-close"
                label={t('common.close')}
                onPress={close}
                variant="primary"
              />
            </View>
          ) : (
            <>
              <Txt style={styles.title}>{t('disputes.open')}</Txt>
              <Select
                testID="open-dispute-reason"
                label={t('disputes.reason_label')}
                placeholder={t('disputes.reason_ph')}
                value={reason}
                options={reasonOptions}
                onChange={setReason}
              />
              <View>
                <Txt style={styles.label}>{t('disputes.description_label')}</Txt>
                <TextInput
                  testID="open-dispute-description"
                  accessibilityLabel={t('disputes.description_label')}
                  style={styles.textarea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('disputes.description_ph')}
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                />
              </View>
              {formError ? (
                <Txt testID="open-dispute-form-error" style={styles.error}>
                  {formError}
                </Txt>
              ) : null}
              {serverError ? (
                <Txt testID="open-dispute-server-error" style={styles.error}>
                  {serverError}
                </Txt>
              ) : null}
              <Button
                testID="open-dispute-submit"
                label={t('disputes.submit')}
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
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700], marginBottom: spacing.xs },
  // Champ de la charte (.field) : fond `bg-app`, liseré discret, rayon 14.
  textarea: {
    minHeight: 96,
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
