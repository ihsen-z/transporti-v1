import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { statusVariant } from '@/shared/ui/statusVariant';
import { formatAmount } from '@/shared/format/money';
import { OpenDisputeSheet } from '@/features/disputes/components/OpenDisputeSheet';
import { TransporterCancelSheet } from './TransporterCancelSheet';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MissionDto } from '../api/dto';
import { useConfirmStart } from '../api/useConfirmStart';
import { useCompleteJob } from '../api/useCompleteJob';
import { DeliveryProofPicker } from './DeliveryProofPicker';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

export function MissionCard({ mission }: { mission: MissionDto }) {
  const { t } = useTranslation();
  const router = useRouter();
  const confirmStart = useConfirmStart();
  const complete = useCompleteJob();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  // 7.2 — preuve de livraison, facultative : le PIN du client reste la seule
  // condition de cloture.
  const [podPhotoUrl, setPodPhotoUrl] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isMatched = mission.status === 'MATCHED';
  const isInProgress = mission.status === 'IN_PROGRESS';
  // Le serveur (TransporterCancelView) n'accepte l'annulation que sur ces deux
  // états ; une fois COMPLETED/CANCELLED le point d'entrée disparaît.
  const cancellable = isMatched || isInProgress;
  // Ce que la mission rapporte VRAIMENT au transporteur : le net, commission
  // déduite. C'est sa raison d'ouvrir l'application ; le backend le servait
  // déjà, le mobile le jetait.
  const hasEarnings = mission.offer_price_net > 0;

  const onComplete = () => {
    const value = pin.trim();
    if (!/^\d{4}$/.test(value)) {
      setPinError(t('missions.pin_format'));
      return;
    }
    setPinError(null);
    complete.mutate({
      jobId: mission.id,
      body: { pin: value, ...(podPhotoUrl ? { pod_photo_url: podPhotoUrl } : {}) },
    });
  };

  // 'unknown' retombe sur le message générique 'state'.
  const completeErrKey = complete.error
    ? complete.error.kind === 'unknown'
      ? 'state'
      : complete.error.kind
    : null;
  const confirmErrKey = confirmStart.error
    ? confirmStart.error.kind === 'unknown'
      ? 'state'
      : confirmStart.error.kind
    : null;

  return (
    <Card>
      <View style={styles.headerRow}>
        <Badge label={t(`missions.status.${mission.status}`)} variant={statusVariant(mission.status)} />
        <Text style={styles.when}>{formatWhen(mission.scheduled_time)}</Text>
      </View>
      {/* 7.1 — l'entree vers le detail de la mission (jalons, marchandise).
          Sur le corridor lui-meme : c'est ce qui identifie la mission, donc
          l'endroit ou l'on cherche a en savoir plus. Les actions restent sur
          cette carte, le detail ne fait que SUIVRE. */}
      <Pressable
        testID={`mission-${mission.id}-open`}
        onPress={() => router.push(`/mission/${mission.id}`)}
        accessibilityRole="link"
        accessibilityLabel={t('missions.detail.open')}
        style={styles.route}
      >
        <RouteRow from={mission.pickup_governorate} to={mission.dropoff_governorate} />
      </Pressable>

      {hasEarnings ? (
        <View style={styles.earnings}>
          <Text style={styles.earningsNet}>
            {t('missions.net', { amount: formatAmount(mission.offer_price_net) })}
          </Text>
          <Text style={styles.earningsDetail}>
            {t('missions.gross_commission', {
              gross: formatAmount(mission.offer_price),
              commission: formatAmount(mission.offer_commission),
            })}
          </Text>
        </View>
      ) : null}

      {isMatched ? (
        <View style={styles.action}>
          <Text style={styles.hint}>{t('missions.confirm_start_hint')}</Text>
          <Button
            testID={`mission-${mission.id}-confirm-start`}
            label={t('missions.confirm_start')}
            onPress={() => confirmStart.mutate(mission.id)}
            variant="primary"
            loading={confirmStart.isPending}
          />
          {confirmErrKey ? (
            <Text testID={`mission-${mission.id}-confirm-start-error`} style={styles.error}>
              {t(`missions.errors.${confirmErrKey}`)}
            </Text>
          ) : null}
        </View>
      ) : null}

      {isInProgress ? (
        <View style={styles.action}>
          <TextField
            testID={`mission-${mission.id}-pin`}
            label={t('missions.pin_label')}
            placeholder={t('missions.pin_ph')}
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            error={pinError ?? undefined}
          />
          {/* E-12 — livré au lot 7.2. L'écran affichait « Photo de preuve :
              bientôt. » (retiré au lot 3, on ne commente pas une absence) ;
              la preuve existe maintenant, et elle part avec la clôture. */}
          <DeliveryProofPicker photoUrl={podPhotoUrl} onChange={setPodPhotoUrl} />
          <Button
            testID={`mission-${mission.id}-complete`}
            label={t('missions.complete')}
            onPress={onComplete}
            variant="cta"
            loading={complete.isPending}
          />
          {completeErrKey ? (
            <Text testID={`mission-${mission.id}-complete-error`} style={styles.error}>
              {t(`missions.errors.${completeErrKey}`)}
            </Text>
          ) : null}
          <Pressable
            testID={`mission-${mission.id}-open-dispute`}
            onPress={() => setDisputeOpen(true)}
            accessibilityRole="button"
          >
            <Text style={styles.dispute}>{t('disputes.open')}</Text>
          </Pressable>
        </View>
      ) : null}

      {cancellable ? (
        <Pressable
          testID={`mission-${mission.id}-cancel`}
          onPress={() => setCancelOpen(true)}
          accessibilityRole="button"
        >
          <Text style={styles.cancel}>{t('missions.cancel.link')}</Text>
        </Pressable>
      ) : null}

      <OpenDisputeSheet
        jobId={disputeOpen ? mission.id : null}
        onClose={() => setDisputeOpen(false)}
      />
      <TransporterCancelSheet
        jobId={cancelOpen ? mission.id : null}
        onClose={() => setCancelOpen(false)}
        onCancelled={() => setCancelOpen(false)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  earnings: { marginTop: spacing.md, gap: 2 },
  // VERT = la valeur : c'est le net perçu, pas le montant facturé au client.
  earningsNet: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text.green },
  earningsDetail: { fontSize: fontSize.sm, color: colors.neutral[500] },
  route: { marginTop: spacing.md },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
  action: { gap: spacing.sm, marginTop: spacing.md },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  error: { color: colors.text.error, fontSize: fontSize.sm, fontWeight: '600' },
  dispute: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  cancel: {
    color: colors.text.error,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
