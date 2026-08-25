import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { statusVariant } from '@/shared/ui/statusVariant';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MyRequestDto } from '../api/dto';
import { useAcceptCounter } from '../api/useAcceptCounter';
import { useCancelRequest } from '../api/useCancelRequest';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

export function MyRequestCard({ request }: { request: MyRequestDto }) {
  const { t } = useTranslation();
  const router = useRouter();
  const accept = useAcceptCounter();
  const cancel = useCancelRequest();

  const isCountered = request.status === 'COUNTERED';
  const accepted = request.status === 'ACCEPTED' || accept.isSuccess;
  // Retirable tant que le transporteur n'a pas encore répondu (ou vient de
  // contre-proposer) — TripRequestCancelView refuse tout autre état.
  const withdrawable =
    (request.status === 'PENDING' || isCountered) && !accept.isSuccess;

  const errKey = accept.error
    ? accept.error.kind === 'unknown'
      ? 'state'
      : accept.error.kind
    : null;
  const cancelErrKey = cancel.error
    ? cancel.error.kind === 'unknown' || cancel.error.kind === 'network'
      ? 'network'
      : 'state'
    : null;

  const confirmWithdraw = () => {
    Alert.alert(t('my_requests.withdraw_confirm_title'), t('my_requests.withdraw_confirm_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('my_requests.withdraw'), style: 'destructive', onPress: () => cancel.mutate(request.id) },
    ]);
  };

  return (
    <Card>
      <View style={styles.headerRow}>
        <Badge label={t(`my_requests.status.${request.status}`)} variant={statusVariant(request.status)} />
        <Text style={styles.when}>{formatWhen(request.job_date)}</Text>
      </View>
      <View style={styles.route}>
        <RouteRow from={request.job_pickup} to={request.job_dropoff} />
      </View>
      <Text style={styles.price}>{t('my_requests.proposed', { price: request.proposed_price })}</Text>

      {isCountered && request.counter_price ? (
        <View style={styles.block}>
          <Text style={styles.counter}>
            {t('my_requests.countered', { price: request.counter_price })}
          </Text>
          <Button
            testID={`my-request-${request.id}-accept-counter`}
            label={t('my_requests.accept_counter')}
            onPress={() => accept.mutate(request.id)}
            variant="cta"
            loading={accept.isPending}
          />
          {errKey ? <Text style={styles.error}>{t(`my_requests.errors.${errKey}`)}</Text> : null}
        </View>
      ) : null}

      {withdrawable ? (
        <View style={styles.block}>
          <Button
            testID={`my-request-${request.id}-withdraw`}
            label={t('my_requests.withdraw')}
            onPress={confirmWithdraw}
            variant="ghost"
            loading={cancel.isPending}
          />
          {cancelErrKey ? (
            <Text style={styles.error}>{t(`my_requests.errors.${cancelErrKey}`)}</Text>
          ) : null}
        </View>
      ) : null}

      {accepted ? (
        <View style={styles.block}>
          <Text style={styles.payment}>
            {request.payment_method === 'DIGITAL'
              ? t('my_requests.accepted_digital')
              : t('my_requests.accepted_cod')}
          </Text>
          {/* Tout ce qui suit l'acceptation — PIN, paiement, suivi, avis,
              litige — vit maintenant dans l'écran de mission. La carte
              affichait auparavant un PIN volatile (perdu au rechargement) et
              des boutons Avis/Litige que le serveur refusait avant la fin de
              la course. */}
          <Button
            testID={`my-request-${request.id}-track`}
            label={t('my_requests.track')}
            onPress={() => router.push(`/mission/${request.job}`)}
            variant="cta"
          />
        </View>
      ) : null}
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
  route: { marginTop: spacing.md },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[700], marginTop: spacing.sm },
  block: { gap: spacing.sm, marginTop: spacing.md },
  counter: { fontSize: fontSize.md, fontWeight: '800', color: colors.brand[500] },
  payment: { fontSize: fontSize.sm, color: colors.neutral[700] },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
});
