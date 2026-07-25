import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, radii } from '@/shared/theme';
import type { DocumentDto } from '../api/dto';

export function DocumentRow({ doc }: { doc: DocumentDto }) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.type} numberOfLines={1}>
        {t(`trust.doc.${doc.document_type}`)}
      </Text>
      <View style={styles.badges}>
        <View style={[styles.badge, { backgroundColor: doc.is_valid ? colors.green[600] : colors.warning }]}>
          <Text style={styles.badgeText}>
            {doc.is_valid ? t('trust.badge_valid') : t('trust.badge_pending')}
          </Text>
        </View>
        {doc.is_expired ? (
          <View style={[styles.badge, { backgroundColor: colors.error }]}>
            <Text style={styles.badgeText}>{t('trust.badge_expired')}</Text>
          </View>
        ) : doc.expires_soon ? (
          <View style={[styles.badge, { backgroundColor: colors.cta[500] }]}>
            <Text style={styles.badgeText}>{t('trust.badge_expires_soon')}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderRadius: radii.lg,
    backgroundColor: colors.neutral[0],
  },
  type: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  badges: { flexDirection: 'row', gap: spacing.xs },
  badge: { paddingVertical: 2, paddingHorizontal: spacing.sm, borderRadius: radii.full },
  badgeText: { color: colors.neutral[0], fontSize: fontSize.sm, fontWeight: '700' },
});
