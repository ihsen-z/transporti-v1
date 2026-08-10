import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Txt } from '@/shared/ui/Txt';
import { Badge } from '@/shared/ui/Badge';
import { formatAmount } from '@/shared/format/money';
import { colors, spacing, fontSize } from '@/shared/theme';
import type { WalletHistoryEntry } from '../api/dto';

function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Une ligne d'historique. Les trois natures de mouvement n'ont pas le même sens
// pour le transporteur, donc pas la même couleur :
//   ESCROW     — argent passé par la plateforme (vert = valeur acquise) ;
//   COD        — espèces encaissées en main propre (neutre : rien à retirer) ;
//   WITHDRAWAL — sortie vers son compte bancaire.
export function WalletHistoryRow({ entry }: { entry: WalletHistoryEntry }) {
  const { t } = useTranslation();

  const amount = entry.kind === 'WITHDRAWAL' ? (entry.amount ?? 0) : (entry.net ?? 0);
  const isCredit = entry.kind !== 'WITHDRAWAL';

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Txt style={styles.kind}>{t(`wallet.kind.${entry.kind}`)}</Txt>
        <Txt style={styles.meta}>
          {entry.job_id ? t('wallet.job_ref', { id: entry.job_id }) : ''}
          {entry.job_id ? ' · ' : ''}
          {formatDay(entry.date)}
        </Txt>
      </View>
      <View style={styles.right}>
        <Txt
          style={[
            styles.amount,
            entry.kind === 'ESCROW' ? styles.credit : null,
            entry.kind === 'WITHDRAWAL' ? styles.debit : null,
          ]}
        >
          {isCredit ? '+' : '−'}
          {formatAmount(amount)} TND
        </Txt>
        <Badge label={entry.status} variant="neutral" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    gap: spacing.md,
  },
  left: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  kind: { fontSize: fontSize.md, fontWeight: '700', color: colors.neutral[900] },
  meta: { fontSize: fontSize.sm, color: colors.neutral[500] },
  amount: { fontSize: fontSize.md, fontWeight: '800', color: colors.neutral[700] },
  credit: { color: colors.green[700] },
  debit: { color: colors.neutral[700] },
});
