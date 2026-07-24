import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { RespondAction, TripRequestDto, TripRequestStatus } from '../api/dto';
import { useRespondRequest } from '../api/useRespondRequest';

// Couleur du badge de statut.
const STATUS_COLOR: Record<TripRequestStatus, string> = {
  PENDING: colors.warning,
  COUNTERED: colors.brand[500],
  ACCEPTED: colors.green[600],
  REJECTED: colors.error,
  CANCELLED: colors.neutral[400],
};

interface Props {
  request: TripRequestDto;
  jobId: number;
}

export function RequestCard({ request, jobId }: Props) {
  const { t } = useTranslation();
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

  const errorMsg = respond.error
    ? t(`requests.errors.${respond.error.kind === 'forbidden' ? 'forbidden' : respond.error.kind === 'network' ? 'network' : 'validation'}`)
    : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.client} numberOfLines={1}>{request.client_name}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[request.status] }]}>
          <Text style={styles.badgeText}>{t(`requests.status.${request.status}`)}</Text>
        </View>
      </View>

      <Text style={styles.price}>{t('requests.proposed', { price: request.proposed_price })}</Text>
      <Text style={styles.payment}>{t(`requests.payment.${request.payment_method}`)}</Text>
      {request.counter_price ? (
        <Text style={styles.counter}>{t('requests.countered', { price: request.counter_price })}</Text>
      ) : null}
      {request.description ? <Text style={styles.desc}>{request.description}</Text> : null}

      {isPending ? (
        <View style={styles.actions}>
          <Button
            label={t('requests.action.accept')}
            onPress={() => act('accept')}
            variant="cta"
            loading={respond.isPending}
            style={styles.actionBtn}
          />
          <Button
            label={t('requests.action.counter')}
            onPress={() => setCounterOpen(true)}
            variant="primary"
            disabled={respond.isPending}
            style={styles.actionBtn}
          />
          <Pressable
            onPress={() => act('reject')}
            disabled={respond.isPending}
            style={styles.rejectBtn}
            accessibilityRole="button"
          >
            <Text style={styles.rejectText}>{t('requests.action.reject')}</Text>
          </Pressable>
        </View>
      ) : null}

      {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

      <Modal
        visible={counterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCounterOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setCounterOpen(false)}>
          {/* Pressable interne : absorbe le tap pour ne pas fermer la feuille. */}
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{t('requests.counter.title')}</Text>
            <TextField
              label={t('requests.counter.placeholder')}
              value={counterPrice}
              onChangeText={setCounterPrice}
              keyboardType="numeric"
              error={counterError ?? undefined}
            />
            <Button
              label={t('requests.counter.confirm')}
              onPress={submitCounter}
              variant="cta"
              style={styles.confirm}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  client: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  badge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.full,
  },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '700' },
  price: { fontSize: fontSize.lg, fontWeight: '800', color: colors.green[700] },
  payment: { fontSize: fontSize.sm, color: colors.neutral[500] },
  counter: { fontSize: fontSize.sm, fontWeight: '700', color: colors.brand[500] },
  desc: { fontSize: fontSize.sm, color: colors.neutral[700] },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { minHeight: 44 },
  rejectBtn: { alignSelf: 'center', paddingVertical: spacing.sm },
  rejectText: { color: colors.error, fontWeight: '700', fontSize: fontSize.sm },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.neutral[0],
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing.xl,
    gap: spacing.lg,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  confirm: { marginTop: spacing.sm },
});
