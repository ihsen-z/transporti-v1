import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { OpenDisputeSheet } from '@/features/disputes/components/OpenDisputeSheet';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { MyRequestDto, MyRequestStatus } from '../api/dto';
import { useAcceptCounter } from '../api/useAcceptCounter';

const STATUS_COLOR: Record<MyRequestStatus, string> = {
  PENDING: colors.warning,
  COUNTERED: colors.brand[500],
  ACCEPTED: colors.green[600],
  REJECTED: colors.error,
  CANCELLED: colors.neutral[400],
};

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
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.route} numberOfLines={1}>
          {request.job_pickup} → {request.job_dropoff}
        </Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[request.status] }]}>
          <Text style={styles.badgeText}>{t(`my_requests.status.${request.status}`)}</Text>
        </View>
      </View>
      <Text style={styles.when}>{formatWhen(request.job_date)}</Text>
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
          <Pressable onPress={() => setDisputeOpen(true)} accessibilityRole="button">
            <Text style={styles.dispute}>{t('disputes.open')}</Text>
          </Pressable>
        </View>
      ) : null}

      <OpenDisputeSheet
        jobId={disputeOpen ? request.job : null}
        onClose={() => setDisputeOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  route: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  badge: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radii.full },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '700' },
  when: { fontSize: fontSize.sm, color: colors.neutral[500] },
  price: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[700] },
  block: { gap: spacing.sm, marginTop: spacing.sm },
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
