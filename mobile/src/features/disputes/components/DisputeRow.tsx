import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { statusVariant } from '@/shared/ui/statusVariant';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MyDisputeDto } from '../api/dto';
import { Txt } from '@/shared/ui/Txt';

export function DisputeRow({ dispute }: { dispute: MyDisputeDto }) {
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.headerRow}>
        <Txt style={styles.reason} numberOfLines={1}>
          {t(`disputes.reason.${dispute.reason}`)}
        </Txt>
        <Badge label={t(`disputes.status.${dispute.status}`)} variant={statusVariant(dispute.status)} />
      </View>
      <View style={styles.route}>
        <RouteRow from={dispute.job_summary.pickup} to={dispute.job_summary.dropoff} />
      </View>
      <Txt style={styles.desc} numberOfLines={2}>{dispute.description}</Txt>
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
  reason: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  route: { marginTop: spacing.md },
  desc: { fontSize: fontSize.sm, color: colors.neutral[500], marginTop: spacing.sm },
});
