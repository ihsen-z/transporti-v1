import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/shared/ui/TextField';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { statusVariant } from '@/shared/ui/statusVariant';
import { OpenDisputeSheet } from '@/features/disputes/components/OpenDisputeSheet';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MissionDto } from '../api/dto';
import { useConfirmStart } from '../api/useConfirmStart';
import { useCompleteJob } from '../api/useCompleteJob';

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
  const confirmStart = useConfirmStart();
  const complete = useCompleteJob();
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);

  const isMatched = mission.status === 'MATCHED';
  const isInProgress = mission.status === 'IN_PROGRESS';

  const onComplete = () => {
    const value = pin.trim();
    if (!/^\d{4}$/.test(value)) {
      setPinError(t('missions.pin_format'));
      return;
    }
    setPinError(null);
    complete.mutate({ jobId: mission.id, body: { pin: value } });
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
      <View style={styles.route}>
        <RouteRow from={mission.pickup_governorate} to={mission.dropoff_governorate} />
      </View>

      {isMatched ? (
        <View style={styles.action}>
          <Text style={styles.hint}>{t('missions.confirm_start_hint')}</Text>
          <Button
            label={t('missions.confirm_start')}
            onPress={() => confirmStart.mutate(mission.id)}
            variant="primary"
            loading={confirmStart.isPending}
          />
          {confirmErrKey ? (
            <Text style={styles.error}>{t(`missions.errors.${confirmErrKey}`)}</Text>
          ) : null}
        </View>
      ) : null}

      {isInProgress ? (
        <View style={styles.action}>
          <TextField
            label={t('missions.pin_label')}
            placeholder={t('missions.pin_ph')}
            value={pin}
            onChangeText={setPin}
            keyboardType="numeric"
            error={pinError ?? undefined}
          />
          <Text style={styles.hint}>{t('missions.photo_deferred')}</Text>
          <Button
            label={t('missions.complete')}
            onPress={onComplete}
            variant="cta"
            loading={complete.isPending}
          />
          {completeErrKey ? (
            <Text style={styles.error}>{t(`missions.errors.${completeErrKey}`)}</Text>
          ) : null}
          <Pressable onPress={() => setDisputeOpen(true)} accessibilityRole="button">
            <Text style={styles.dispute}>{t('disputes.open')}</Text>
          </Pressable>
        </View>
      ) : null}

      <OpenDisputeSheet
        jobId={disputeOpen ? mission.id : null}
        onClose={() => setDisputeOpen(false)}
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
  action: { gap: spacing.sm, marginTop: spacing.md },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
  error: { color: colors.error, fontSize: fontSize.sm, fontWeight: '600' },
  dispute: {
    color: colors.neutral[500],
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
