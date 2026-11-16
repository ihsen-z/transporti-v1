import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { DocumentDto } from '../api/dto';
import { Txt } from '@/shared/ui/Txt';
import { documentState } from '../data/documentState';

export function DocumentRow({ doc }: { doc: DocumentDto }) {
  const { t } = useTranslation();

  const state = documentState(doc);
  const badgeColor =
    state === 'valid' ? colors.green[600] : state === 'rejected' ? colors.error : colors.warning;
  const badgeLabel =
    state === 'valid'
      ? t('trust.badge_valid')
      : state === 'rejected'
        ? t('trust.badge_rejected')
        : t('trust.badge_pending');

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Txt style={styles.type} numberOfLines={1}>
          {t(`trust.doc.${doc.document_type}`)}
        </Txt>
        <View style={styles.badges}>
          <View testID={`trust-doc-${doc.id}-badge`} style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Txt style={styles.badgeText}>{badgeLabel}</Txt>
          </View>
          {doc.is_expired ? (
            <View style={[styles.badge, { backgroundColor: colors.error }]}>
              <Txt style={styles.badgeText}>{t('trust.badge_expired')}</Txt>
            </View>
          ) : doc.expires_soon ? (
            <View style={[styles.badge, { backgroundColor: colors.cta[500] }]}>
              <Txt style={styles.badgeText}>{t('trust.badge_expires_soon')}</Txt>
            </View>
          ) : null}
        </View>
      </View>
      {state === 'rejected' ? (
        <View testID={`trust-doc-${doc.id}-rejection`}>
          <Txt style={styles.reason}>{t('trust.rejected_reason', { reason: doc.rejection_reason })}</Txt>
          <Txt style={styles.resend}>{t('trust.rejected_resend')}</Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  reason: { fontSize: fontSize.sm, color: colors.error, fontWeight: '600' },
  resend: { fontSize: fontSize.sm, color: colors.neutral[700], marginTop: 2 },
  type: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  badges: { flexDirection: 'row', gap: spacing.xs },
  badge: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radii.full },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '700' },
});
