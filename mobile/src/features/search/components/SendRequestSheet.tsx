import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { PaymentMethod, TripResultDto } from '../api/dto';
import { useSendTripRequest } from '../api/useSendTripRequest';

interface Props {
  trip: TripResultDto | null;
  onClose: () => void;
}

export function SendRequestSheet({ trip, onClose }: Props) {
  const { t } = useTranslation();
  const send = useSendTripRequest();
  const [price, setPrice] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('DIGITAL');
  const [description, setDescription] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);

  const methodOptions = [
    { value: 'DIGITAL' as const, label: t('search.request.method_digital') },
    { value: 'COD' as const, label: t('search.request.method_cod') },
  ];

  const submit = () => {
    if (!trip) return;
    const n = Number(price);
    if (!price || Number.isNaN(n) || n <= 0) {
      setPriceError(t('search.errors.price'));
      return;
    }
    setPriceError(null);
    send.mutate({
      jobId: trip.id,
      body: { proposed_price: n, payment_method: method, description },
    });
  };

  const errorMsg = send.error
    ? t(`search.errors.${send.error.kind === 'network' ? 'network' : 'validation'}`)
    : null;

  const close = () => {
    // Réinitialise pour la prochaine ouverture.
    setPrice('');
    setMethod('DIGITAL');
    setDescription('');
    setPriceError(null);
    send.reset();
    onClose();
  };

  return (
    <Modal
      visible={trip !== null}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          {send.isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{t('search.request.success')}</Text>
              <Button label={t('common.close')} onPress={close} variant="primary" />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('search.request.title')}</Text>
              <TextField
                label={t('search.request.price_label')}
                placeholder={t('search.request.price_ph')}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                error={priceError ?? undefined}
              />
              <Select
                label={t('search.request.method')}
                placeholder={t('search.request.method')}
                value={method}
                options={methodOptions}
                onChange={setMethod}
              />
              <TextField
                label={t('search.request.description')}
                placeholder={t('search.request.description_ph')}
                value={description}
                onChangeText={setDescription}
                autoCapitalize="sentences"
              />
              {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
              <Button
                label={t('search.request.submit')}
                onPress={submit}
                variant="cta"
                loading={send.isPending}
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
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.green[700],
    textAlign: 'center',
  },
});
