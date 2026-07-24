import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { DisputeStatus, MyDisputeDto } from '../api/dto';

const STATUS_COLOR: Record<DisputeStatus, string> = {
  OPEN: colors.warning,
  INVESTIGATING: colors.brand[500],
  RESOLVED: colors.green[600],
  REJECTED: colors.neutral[400],
};

export function DisputeRow({ dispute }: { dispute: MyDisputeDto }) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.reason} numberOfLines={1}>
          {t(`disputes.reason.${dispute.reason}`)}
        </Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[dispute.status] }]}>
          <Text style={styles.badgeText}>{t(`disputes.status.${dispute.status}`)}</Text>
        </View>
      </View>
      <Text style={styles.route} numberOfLines={1}>
        {dispute.job_summary.pickup} → {dispute.job_summary.dropoff}
      </Text>
      <Text style={styles.desc} numberOfLines={2}>{dispute.description}</Text>
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
  reason: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  badge: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radii.full },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '700' },
  route: { fontSize: fontSize.sm, color: colors.neutral[700] },
  desc: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
