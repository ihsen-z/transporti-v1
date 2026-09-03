import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { PaymentMethod, TripResultDto } from '../api/dto';
import { useSendTripRequest } from '../api/useSendTripRequest';
import { PREFERER_MESSAGE_SERVEUR, type SendRequestField } from '../api/requestError';

interface Props {
  trip: TripResultDto | null;
  onClose: () => void;
}

// Champs dont l'erreur s'affiche SOUS le champ, là où se trouve la correction.
// `payment_method` est un Select sans emplacement d'erreur : son refus part
// dans le message général, qui porte alors le texte du serveur (précis, il
// cite le plafond).
const CHAMPS_INLINE: readonly SendRequestField[] = ['description', 'proposed_price'];

export function SendRequestSheet({ trip, onClose }: Props) {
  const { t } = useTranslation();
  const send = useSendTripRequest();
  const [price, setPrice] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('DIGITAL');
  const [description, setDescription] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const methodOptions = [
    { value: 'DIGITAL' as const, label: t('search.request.method_digital') },
    { value: 'COD' as const, label: t('search.request.method_cod') },
  ];

  const submit = () => {
    if (!trip) return;
    const n = Number(price);
    const texte = description.trim();

    // La description est REQUISE côté serveur (`ReturnTripRequest.description`
    // n'est pas `blank=True`) et c'est la seule information sur laquelle le
    // transporteur décide. On la valide donc ici plutôt que de laisser le
    // serveur refuser une demande que l'écran présentait comme complète.
    const prixInvalide = !price || Number.isNaN(n) || n <= 0;
    setPriceError(prixInvalide ? t('search.errors.price') : null);
    setDescriptionError(texte ? null : t('search.errors.description_required'));
    if (prixInvalide || !texte) return;

    send.mutate({
      jobId: trip.id,
      body: { proposed_price: n, payment_method: method, description: texte },
    });
  };

  const failure = send.error?.failure ?? null;

  // Erreur de champ renvoyée par le serveur, rattachée à son champ.
  const erreurServeurChamp = (champ: SendRequestField): string | undefined => {
    if (!failure || failure.field !== champ) return undefined;
    if (PREFERER_MESSAGE_SERVEUR[champ] && failure.serverMessage) {
      return failure.serverMessage;
    }
    return t(`search.errors.field.${champ}`);
  };

  // Ce qui ne se rattache à aucun champ affichable : règle métier de la vue
  // (« Vous avez déjà une demande en cours sur ce trajet »), réseau, ou repli.
  const erreurGenerale = (() => {
    if (!failure) return null;
    if (failure.field && CHAMPS_INLINE.includes(failure.field)) return null;
    if (failure.kind === 'network') return t('search.errors.network');
    if (failure.serverMessage) return failure.serverMessage;
    if (failure.field === 'payment_method') return t('search.errors.field.payment_method');
    return t('search.errors.unknown');
  })();

  const close = () => {
    // Réinitialise pour la prochaine ouverture.
    setPrice('');
    setMethod('DIGITAL');
    setDescription('');
    setPriceError(null);
    setDescriptionError(null);
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
              <Button
                testID="send-request-close"
                label={t('common.close')}
                onPress={close}
                variant="primary"
              />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('search.request.title')}</Text>
              <TextField
                testID="send-request-price"
                label={t('search.request.price_label')}
                placeholder={t('search.request.price_ph')}
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                error={priceError ?? erreurServeurChamp('proposed_price')}
              />
              <Select
                testID="send-request-method"
                label={t('search.request.method')}
                placeholder={t('search.request.method')}
                value={method}
                options={methodOptions}
                onChange={setMethod}
              />
              <TextField
                testID="send-request-description"
                label={t('search.request.description')}
                placeholder={t('search.request.description_ph')}
                value={description}
                onChangeText={setDescription}
                autoCapitalize="sentences"
                error={descriptionError ?? erreurServeurChamp('description')}
              />
              {erreurGenerale ? (
                <Text testID="send-request-error" style={styles.error}>
                  {erreurGenerale}
                </Text>
              ) : null}
              <Button
                testID="send-request-submit"
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
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.neutral[900] },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
  successBox: { gap: spacing.lg, paddingVertical: spacing.lg },
  successText: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.text.green,
    textAlign: 'center',
  },
});
