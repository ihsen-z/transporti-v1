import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Avatar } from '@/shared/ui/Avatar';
import { Badge } from '@/shared/ui/Badge';
import { statusVariant } from '@/shared/ui/statusVariant';
import { TOUCH_TARGET, colors, fontSize, radii, spacing } from '@/shared/theme';
import type { RespondAction, TripRequestDto } from '../api/dto';
import { useRespondRequest } from '../api/useRespondRequest';
import { RequestGoodsSummary } from './RequestGoodsSummary';
import { useSheetBottomPadding } from '@/shared/ui/useSheetBottomPadding';

interface Props {
  request: TripRequestDto;
  jobId: number;
  /**
   * T2.1 — affiche le corridor du trajet concerné. Utile uniquement dans la
   * boîte de réception consolidée : sur le détail d'UN trajet, le corridor est
   * déjà dans l'en-tête et le répéter serait du bruit.
   */
  montrerCorridor?: boolean;
}

export function RequestCard({ request, jobId, montrerCorridor = false }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const respond = useRespondRequest();
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterPrice, setCounterPrice] = useState('');
  const [counterError, setCounterError] = useState<string | null>(null);

  const isPending = request.status === 'PENDING';

  const act = (action: RespondAction, counterValue?: number) =>
    respond.mutate({ requestId: request.id, jobId, body: { action, counter_price: counterValue } });

  const submitCounter = () => {
    const n = Number(counterPrice);
    if (!counterPrice || Number.isNaN(n) || n <= 0) {
      setCounterError(t('requests.counter.invalid'));
      return;
    }
    setCounterError(null);
    setCounterOpen(false);
    act('counter', n);
  };

  // Le serveur rédige ses refus en français et cite ses bornes : on
  // affiche son texte, et le message localisé sert de repli.
  const errorMsg = respond.error
    ? (respond.error.serverMessage ??
       t(`requests.errors.${respond.error.kind === 'forbidden' ? 'forbidden' : respond.error.kind === 'network' ? 'network' : 'validation'}`))
    : null;

  // Bord à bord Android 16 : la feuille ne colle pas la barre de gestes.
  const sheetPadding = useSheetBottomPadding(spacing.xl);

  return (
    <Card>
      <View style={styles.top}>
        <Avatar name={request.client_name} size={42} />
        <Txt style={styles.client} numberOfLines={1}>{request.client_name}</Txt>
        <Badge label={t(`requests.status.${request.status}`)} variant={statusVariant(request.status)} />
      </View>

      {montrerCorridor ? (
        // Tappable : c'est le seul point d'entree vers le detail d'UN trajet
        // (`requests/[jobId]`) depuis que la liste consolidee a remplace la
        // liste de trajets. Le detail reste utile pour traiter d'affilee
        // toutes les demandes d'un meme corridor.
        <Pressable
          testID={`request-${request.id}-open-trip`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/requests/[jobId]',
              params: {
                jobId: String(jobId),
                pickup: request.job_pickup,
                dropoff: request.job_dropoff,
              },
            })
          }
        >
          <Txt style={styles.corridor} numberOfLines={1}>
            {request.job_pickup} → {request.job_dropoff}
          </Txt>
        </Pressable>
      ) : null}

      {/* VERT = valeur : le prix proposé par le client. */}
      <Txt style={styles.price}>{t('requests.proposed', { price: request.proposed_price })}</Txt>
      <View style={styles.meta}>
        <Badge label={t(`requests.payment.${request.payment_method}`)} variant="cod" />
      </View>
      {request.counter_price ? (
        <Txt style={styles.counter}>{t('requests.countered', { price: request.counter_price })}</Txt>
      ) : null}
      {request.description ? <Txt style={styles.desc}>{request.description}</Txt> : null}
      {/* Lot 6.1 — poids, volume, photos, adresse et créneau : de quoi trancher
          sans rappeler la cliente. Le bloc s'efface s'il n'a rien à dire. */}
      <RequestGoodsSummary request={request} />

      {isPending ? (
        <View style={styles.actions}>
          {/* Paire de la charte : Accepter en BLEU, Contre-proposer en FANTÔME,
              côte à côte. L'orange était utilisé ici pour « Accepter », ce qui
              contredisait sa règle — l'orange est le CTA UNIQUE d'un écran, et
              une liste de demandes en affichait autant que de cartes. */}
          <View style={styles.actionRow}>
            <Button
              testID={`request-${request.id}-counter`}
              label={t('requests.action.counter')}
              onPress={() => setCounterOpen(true)}
              variant="ghost"
              size="sm"
              disabled={respond.isPending}
              style={styles.actionBtn}
            />
            <Button
              testID={`request-${request.id}-accept`}
              label={t('requests.action.accept')}
              onPress={() => act('accept')}
              variant="primary"
              size="sm"
              loading={respond.isPending}
              style={styles.actionBtn}
            />
          </View>
          <Pressable
            testID={`request-${request.id}-reject`}
            onPress={() => act('reject')}
            disabled={respond.isPending}
            style={styles.rejectBtn}
            accessibilityRole="button"
          >
            <Txt style={styles.rejectText}>{t('requests.action.reject')}</Txt>
          </Pressable>
        </View>
      ) : null}

      {errorMsg ? <Txt style={styles.error}>{errorMsg}</Txt> : null}

      <Modal
        visible={counterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCounterOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCounterOpen(false)}>
          {/* Pressable interne : absorbe le tap pour ne pas fermer la feuille. */}
          <Pressable style={[styles.sheet, { paddingBottom: sheetPadding }]} onPress={() => undefined}>
            <Txt style={styles.sheetTitle}>{t('requests.counter.title')}</Txt>
            <TextField
              testID={`request-${request.id}-counter-price`}
              label={t('requests.counter.placeholder')}
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="numeric"
              error={counterError ?? undefined}
            />
            <Button
              testID={`request-${request.id}-counter-confirm`}
              label={t('requests.counter.confirm')}
              onPress={submitCounter}
              variant="cta"
              style={styles.confirm}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  corridor: {
    fontSize: fontSize.sm,
    color: colors.neutral[500],
    marginBottom: spacing.xs,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  client: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  price: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text.green, marginTop: spacing.md },
  meta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  counter: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[500], marginTop: spacing.xs },
  desc: { fontSize: fontSize.sm, color: colors.neutral[700], marginTop: spacing.xs },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  // .acts de la maquette : deux boutons de largeur égale, gouttière 8.
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  rejectBtn: {
    minHeight: TOUCH_TARGET,
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  rejectText: { color: colors.text.error, fontWeight: '700', fontSize: fontSize.sm },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  confirm: { marginTop: spacing.sm },
});
