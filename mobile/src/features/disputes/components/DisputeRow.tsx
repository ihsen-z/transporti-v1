import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { RouteRow } from '@/shared/ui/RouteRow';
import { statusVariant } from '@/shared/ui/statusVariant';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { MyDisputeDto } from '../api/dto';

export function DisputeRow({ dispute }: { dispute: MyDisputeDto }) {
  const { t } = useTranslation();

  return (
    <Card>
      <View style={styles.headerRow}>
        <Text style={styles.reason} numberOfLines={1}>
          {t(`disputes.reason.${dispute.reason}`)}
        </Text>
        <Badge label={t(`disputes.status.${dispute.status}`)} variant={statusVariant(dispute.status)} />
      </View>
      <View style={styles.route}>
        <RouteRow from={dispute.job_summary.pickup} to={dispute.job_summary.dropoff} />
      </View>
      <Text style={styles.desc} numberOfLines={2}>{dispute.description}</Text>
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
