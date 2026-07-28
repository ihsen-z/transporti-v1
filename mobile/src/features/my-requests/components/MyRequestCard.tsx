import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { statusVariant } from '@/shared/ui/statusVariant';
import { OpenDisputeSheet } from '@/features/disputes/components/OpenDisputeSheet';
import { OpenReviewSheet } from '@/features/reviews/components/OpenReviewSheet';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { MyRequestDto } from '../api/dto';
import { useAcceptCounter } from '../api/useAcceptCounter';

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
  const accept = useAcceptCounter();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const isCountered = request.status === 'COUNTERED';
  const accepted = request.status === 'ACCEPTED' || accept.isSuccess;
  // Le PIN n'est disponible que dans la réponse d'acceptation (limite backend).
  const deliveryPin = accept.data?.job.delivery_pin ?? null;

  const errKey = accept.error
    ? accept.error.kind === 'unknown'
      ? 'state'
      : accept.error.kind
    : null;

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
            label={t('my_requests.accept_counter')}
            onPress={() => accept.mutate(request.id)}
            variant="cta"
            loading={accept.isPending}
          />
          {errKey ? <Text style={styles.error}>{t(`my_requests.errors.${errKey}`)}</Text> : null}
        </View>
      ) : null}

      {accepted ? (
        <View style={styles.block}>
          <Text style={styles.payment}>
            {request.payment_method === 'DIGITAL'
              ? t('my_requests.accepted_digital')
              : t('my_requests.accepted_cod')}
          </Text>
          {deliveryPin ? (
            <View style={styles.pinBox}>
              <Text style={styles.pinLabel}>{t('my_requests.pin_label')}</Text>
              <Text style={styles.pinValue}>{deliveryPin}</Text>
            </View>
          ) : (
            <Text style={styles.hint}>{t('my_requests.pin_note')}</Text>
          )}
          <Button
            label={t('reviews.open')}
            onPress={() => setReviewOpen(true)}
            variant="primary"
          />
          <Pressable onPress={() => setDisputeOpen(true)} accessibilityRole="button">
            <Text style={styles.dispute}>{t('disputes.open')}</Text>
          </Pressable>
        </View>
      ) : null}

      <OpenDisputeSheet
        jobId={disputeOpen ? request.job : null}
        onClose={() => setDisputeOpen(false)}
      />
      <OpenReviewSheet
        jobId={reviewOpen ? request.job : null}
        onClose={() => setReviewOpen(false)}
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
  route: { marginTop: spacing.md },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[700], marginTop: spacing.sm },
  block: { gap: spacing.sm, marginTop: spacing.md },
  counter: { fontSize: fontSize.md, fontWeight: '800', color: colors.brand[500] },
  payment: { fontSize: fontSize.sm, color: colors.neutral[700] },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  // Encadré VERT = valeur (le code qui débloque la livraison).
  pinBox: {
    backgroundColor: colors.brand[50],
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  pinLabel: { fontSize: fontSize.sm, color: colors.neutral[700], textAlign: 'center' },
  pinValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.green[700],
  },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  dispute: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
