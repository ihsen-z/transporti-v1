import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { DisputeReason } from '../api/dto';
import { useCreateDispute } from '../api/useCreateDispute';

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

  const serverError = create.error
    ? t(`disputes.errors.${create.error.kind === 'forbidden' ? 'forbidden' : create.error.kind === 'network' ? 'network' : 'validation'}`)
    : null;

  return (
    <Modal visible={jobId !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {create.isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{t('disputes.success')}</Text>
              <Button label={t('common.close')} onPress={close} variant="primary" />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('disputes.open')}</Text>
              <Select
                label={t('disputes.reason_label')}
                placeholder={t('disputes.reason_ph')}
                value={reason}
                options={reasonOptions}
                onChange={setReason}
              />
              <View>
                <Text style={styles.label}>{t('disputes.description_label')}</Text>
                <TextInput
                  style={styles.textarea}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t('disputes.description_ph')}
                  placeholderTextColor={colors.neutral[400]}
                  multiline
                />
              </View>
              {formError ? <Text style={styles.error}>{formError}</Text> : null}
              {serverError ? <Text style={styles.error}>{serverError}</Text> : null}
              <Button
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
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.neutral[700], marginBottom: spacing.xs },
  textarea: {
    minHeight: 96,
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
