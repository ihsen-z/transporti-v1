import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Txt } from '@/shared/ui/Txt';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { useClientCancel } from '../api/useClientCancel';

interface Props {
  jobId: number | null;
  onClose: () => void;
  onCancelled: () => void;
}

// Annulation d'une mission déjà acceptée. Le motif est obligatoire côté serveur
// — il alimente la trace JobEvent, donc le taux d'annulation (K7) que le BO
// suit. On le demande donc franchement plutôt que d'envoyer un texte vide.
export function CancelMissionSheet({ jobId, onClose, onCancelled }: Props) {
  const { t } = useTranslation();
  const cancel = useClientCancel();
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
      setFormError(t('tracking.errors.reason_required'));
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

  const serverError = cancel.error ? t(`tracking.errors.${cancel.error.kind}`) : null;

  return (
    <Modal visible={jobId !== null} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Txt style={styles.title}>{t('tracking.cancel_title')}</Txt>
          <Txt style={styles.warning}>{t('tracking.cancel_warning')}</Txt>

          <TextInput
            testID="cancel-mission-reason"
            accessibilityLabel={t('tracking.cancel_reason_placeholder')}
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder={t('tracking.cancel_reason_placeholder')}
            placeholderTextColor={colors.neutral[400]}
            multiline
            numberOfLines={3}
          />

          {formError ? (
            <Txt testID="cancel-mission-form-error" style={styles.error}>
              {formError}
            </Txt>
          ) : null}
          {serverError ? (
            <Txt testID="cancel-mission-server-error" style={styles.error}>
              {serverError}
            </Txt>
          ) : null}

          <Button
            testID="cancel-mission-submit"
            label={t('tracking.cancel_submit')}
            onPress={submit}
            variant="danger"
            loading={cancel.isPending}
          />
          <Button
            testID="cancel-mission-keep"
            label={t('tracking.cancel_keep')}
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
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    color: colors.neutral[900],
    fontSize: fontSize.md,
  },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
});
