import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useWallet } from '@/features/wallet/api/useWallet';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import { CorridorPerformanceCard } from '@/features/stats/components/CorridorPerformanceCard';
import { useLoyalClients } from '@/features/stats/api/useLoyalClients';
import { LoyalClientsCard } from '@/features/stats/components/LoyalClientsCard';
import { WithdrawalSheet } from '@/features/wallet/components/WithdrawalSheet';
import { WalletHistoryRow } from '@/features/wallet/components/WalletHistoryRow';
import type { WalletHistoryEntry } from '@/features/wallet/api/dto';
import { formatAmount } from '@/shared/format/money';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize } from '@/shared/theme';

// 5ᵉ onglet transporteur : le PORTEFEUILLE, pas un tableau de KPI.
//
// L'écran affichait auparavant quatre tuiles issues de transporter/stats/ et
// s'arrêtait là : aucun historique, aucun retrait possible, et 0 TND affiché
// après une livraison payée en espèces. Il consomme désormais GET wallet/,
// la source unique des montants (aucun calcul côté mobile).
export default function GainsScreen() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isTransporter = role === 'TRANSPORTER';
  const wallet = useWallet(isTransporter);
  // T5.4 — B-3b etait calcule depuis le lot 1 et lu nulle part. La charte
  // n'ouvre pas de sixieme onglet : la performance par corridor vit sous le
  // portefeuille, ou le transporteur vient deja voir ce qu'il a gagne.
  const stats = useTransporterStats(isTransporter);
  // T5.5 — le pendant transporteur des favoris. Meme place que la performance
  // par corridor : c'est la meme question, « ou est ma valeur ».
  const fidelite = useLoyalClients(isTransporter);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const d = wallet.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={queryRefreshControl(wallet)}
      >
        <Txt style={styles.title}>{t('gains.title')}</Txt>

        {wallet.isLoading || !d ? (
          <SkeletonList />
        ) : (
          <>
            {/* Solde retirable : la seule somme que la plateforme doit. */}
            <Card style={styles.hero}>
              <Txt style={styles.heroLabel}>{t('gains.available')}</Txt>
              <Txt style={styles.heroValue}>
                {formatAmount(d.available)}
                <Txt style={styles.heroUnit}> TND</Txt>
              </Txt>
              <Button
                testID="gains-withdraw"
                label={t('wallet.withdraw')}
                onPress={() => setWithdrawOpen(true)}
                variant="cta"
                disabled={d.available <= 0}
              />
              {d.available <= 0 ? (
                <Txt style={styles.hint}>{t('wallet.nothing_to_withdraw')}</Txt>
              ) : null}
            </Card>

            <View style={styles.grid}>
              <Card style={styles.tile}>
                <Txt style={styles.tileLabel}>{t('gains.pending')}</Txt>
                <Txt style={styles.tileValue}>{formatAmount(d.pending_net)} TND</Txt>
              </Card>
              <Card style={styles.tile}>
                <Txt style={styles.tileLabel}>{t('gains.confirmed')}</Txt>
                <Txt style={styles.tileValue}>{formatAmount(d.released_net)} TND</Txt>
              </Card>
            </View>

            {/* Espèces déjà en main + commission due en retour. Séparé du solde
                retirable, sinon le transporteur croirait pouvoir retirer un
                argent qu'il détient déjà. */}
            {d.cod_collected_net > 0 || d.cod_debt > 0 ? (
              <Card style={styles.codCard}>
                <Txt style={styles.sectionTitle}>{t('wallet.cod_title')}</Txt>
                <View style={styles.codRow}>
                  <Txt style={styles.codLabel}>{t('wallet.cod_collected')}</Txt>
                  <Txt style={styles.codValue}>{formatAmount(d.cod_collected_net)} TND</Txt>
                </View>
                <View style={styles.codRow}>
                  <Txt style={styles.codLabel}>{t('wallet.cod_debt')}</Txt>
                  <Txt style={styles.codDebt}>−{formatAmount(d.cod_debt)} TND</Txt>
                </View>
                <Txt style={styles.hint}>{t('wallet.cod_hint')}</Txt>
              </Card>
            ) : null}

            <Txt style={styles.sectionTitle}>{t('wallet.history')}</Txt>
            {d.history.length === 0 ? (
              <EmptyState icon="trending-up" title={t('wallet.empty_history')} />
            ) : (
              <Card>
                {d.history.map((entry: WalletHistoryEntry) => (
                  <WalletHistoryRow
                    key={`${entry.kind}-${entry.id ?? entry.job_id}-${entry.date}`}
                    entry={entry}
                  />
                ))}
              </Card>
            )}
          </>
        )}

        {isTransporter && stats.data && (
          <CorridorPerformanceCard
            corridors={stats.data.revenue_by_corridor ?? []}
            opportunites={stats.data.underserved_corridors ?? []}
          />
        )}

        {isTransporter && fidelite.data && (
          <LoyalClientsCard fidelite={fidelite.data} />
        )}
      </ScrollView>

      <WithdrawalSheet
        visible={withdrawOpen}
        available={d?.available ?? 0}
        onClose={() => setWithdrawOpen(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  hero: { gap: spacing.md },
  heroLabel: { fontSize: fontSize.md, color: colors.neutral[500], fontWeight: '600' },
  // VERT = la valeur (règle de la charte).
  heroValue: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.green[700] },
  heroUnit: { fontSize: fontSize.md, fontWeight: '600', color: colors.green[700] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { width: '48%', gap: spacing.xs },
  tileLabel: { fontSize: fontSize.sm, color: colors.neutral[500], fontWeight: '600' },
  tileValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  codCard: { gap: spacing.sm },
  codRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codLabel: { fontSize: fontSize.md, color: colors.neutral[700] },
  codValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.neutral[900] },
  codDebt: { fontSize: fontSize.md, fontWeight: '800', color: colors.error },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.neutral[900] },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
