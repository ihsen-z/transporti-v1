import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { useTransporterCancel } from '../api/useTransporterCancel';

interface Props {
  jobId: number | null;
  onClose: () => void;
  onCancelled: () => void;
}

// Annulation d'une mission assignée, côté TRANSPORTEUR. Le motif est
// obligatoire côté serveur (JobEvent CANCELLED_BY_TRANSPORTER -> K7) ; le job
// repart en PUBLISHED et l'escrow éventuel est remboursé au client.
export function TransporterCancelSheet({ jobId, onClose, onCancelled }: Props) {
  const { t } = useTranslation();
  const cancel = useTransporterCancel();
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const close = () => {
    setReason('');
    setFormError(null);
    cancel.reset();
    onClose();
  };

  const submit = () => {
    if (!jobId) return;
    if (reason.trim().length < 5) {
      setFormError(t('missions.cancel.errors.reason_required'));
      return;
    }
    setFormError(null);
    cancel.mutate(
      { jobId, reason: reason.trim() },
      {
        onSuccess: () => {
          close();
          onCancelled();
        },
      },
    );
  };

  const serverError = cancel.error
    ? t(`missions.cancel.errors.${cancel.error.kind === 'network' ? 'network' : 'state'}`)
    : null;

  return (
    <Modal visible={jobId !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Txt style={styles.title}>{t('missions.cancel.title')}</Txt>
          <Txt style={styles.warning}>{t('missions.cancel.warning')}</Txt>

          <TextInput
            testID="transporter-cancel-reason"
            accessibilityLabel={t('missions.cancel.reason_placeholder')}
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder={t('missions.cancel.reason_placeholder')}
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={3}
          />

          {formError ? (
            <Txt testID="transporter-cancel-form-error" style={styles.error}>
              {formError}
            </Txt>
          ) : null}
          {serverError ? (
            <Txt testID="transporter-cancel-server-error" style={styles.error}>
              {serverError}
            </Txt>
          ) : null}

          <Button
            testID="transporter-cancel-submit"
            label={t('missions.cancel.submit')}
            onPress={submit}
            variant="danger"
            loading={cancel.isPending}
          />
          <Button
            testID="transporter-cancel-keep"
            label={t('missions.cancel.keep')}
            onPress={close}
            variant="ghost"
          />
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
    gap: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  warning: { fontSize: fontSize.md, color: colors.neutral[700] },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral[300],
    borderRadius: radii.input,
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    color: colors.neutral[900],
    fontSize: fontSize.md,
  },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
});
