import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Txt } from '@/shared/ui/Txt';
import { formatAmount } from '@/shared/format/money';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import { MIN_WITHDRAWAL_TND } from '../api/dto';
import { useCreateWithdrawal } from '../api/useCreateWithdrawal';

interface Props {
  visible: boolean;
  available: number;
  onClose: () => void;
}

// Demande de virement. Le serveur reste l'autorité sur les règles (minimum,
// solde disponible, RIB requis) : on ne fait ici que les rappeler à
// l'utilisateur avant l'envoi, et on affiche le message serveur tel quel en cas
// de refus — dupliquer les règles ferait diverger les deux.
export function WithdrawalSheet({ visible, available, onClose }: Props) {
  const { t } = useTranslation();
  const create = useCreateWithdrawal();
  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const close = () => {
    setAmount('');
    setBankDetails('');
    setFormError(null);
    create.reset();
    onClose();
  };

  const submit = () => {
    const parsed = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setFormError(t('wallet.errors.amount_invalid'));
      return;
    }
    if (parsed < MIN_WITHDRAWAL_TND) {
      setFormError(t('wallet.errors.amount_min', { min: MIN_WITHDRAWAL_TND }));
      return;
    }
    if (!bankDetails.trim()) {
      setFormError(t('wallet.errors.bank_required'));
      return;
    }
    setFormError(null);
    create.mutate({ amount: String(parsed), bankDetails: bankDetails.trim() });
  };

  const serverError = create.error
    ? (create.error.serverMessage ?? t(`wallet.errors.${create.error.kind}`))
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {create.isSuccess ? (
            <View style={styles.successBox}>
              <Txt style={styles.successText}>{t('wallet.withdrawal_success')}</Txt>
              <Button label={t('common.close')} onPress={close} variant="primary" />
            </View>
          ) : (
            <>
              <Txt style={styles.title}>{t('wallet.withdraw')}</Txt>
              <Txt style={styles.available}>
                {t('wallet.available_hint', { amount: formatAmount(available) })}
              </Txt>

              <TextField
                testID="withdrawal-amount"
                label={t('wallet.amount_label')}
                value={amount}
                onChangeText={setAmount}
                placeholder={String(MIN_WITHDRAWAL_TND)}
                keyboardType="decimal-pad"
              />
              <TextField
                testID="withdrawal-bank"
                label={t('wallet.bank_label')}
                value={bankDetails}
                onChangeText={setBankDetails}
                placeholder={t('wallet.bank_placeholder')}
                autoCapitalize="characters"
              />

              {formError ? (
                <Txt testID="withdrawal-form-error" style={styles.error}>
                  {formError}
                </Txt>
              ) : null}
              {serverError ? (
                <Txt testID="withdrawal-server-error" style={styles.error}>
                  {serverError}
                </Txt>
              ) : null}

              <Txt style={styles.delay}>{t('wallet.withdrawal_delay')}</Txt>

              <Button
                label={t('wallet.withdraw_submit')}
                onPress={submit}
                variant="cta"
                loading={create.isPending}
              />
              <Button label={t('common.cancel')} onPress={close} variant="ghost" />
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
    gap: spacing.md,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  available: { fontSize: fontSize.md, color: colors.neutral[700] },
  delay: { fontSize: fontSize.sm, color: colors.neutral[500] },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: { fontSize: fontSize.md, color: colors.neutral[900], textAlign: 'center' },
});
