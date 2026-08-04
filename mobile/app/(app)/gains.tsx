import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import { formatAmount } from '@/shared/format/money';
import { Txt } from '@/shared/ui/Txt';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/SkeletonList';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize } from '@/shared/theme';

// 5ᵉ onglet transporteur de la charte. Les quatre montants viennent tous de
// GET transporter/stats/ (K4, K5, K10, K11) : aucun n'est recalculé ici.
export default function GainsScreen() {
  const { t } = useTranslation();
  const role = useAuthStore((s) => s.user?.role);
  const isTransporter = role === 'TRANSPORTER';
  const stats = useTransporterStats(isTransporter);

  const d = stats.data;
  const tiles = d
    ? [
        { key: 'available', value: d.wallet_available }, // K10
        { key: 'confirmed', value: d.earnings_confirmed }, // K4
        { key: 'pending', value: d.earnings_pending }, // K11
        { key: 'potential', value: d.potential_earnings }, // K5
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={queryRefreshControl(stats)}
      >
        <Txt style={styles.title}>{t('gains.title')}</Txt>

        {stats.isLoading ? (
          <SkeletonList />
        ) : (
          <>
            <View style={styles.grid}>
              {tiles.map((tile) => (
                <Card key={tile.key} style={styles.tile}>
                  <Txt style={styles.tileLabel}>{t(`gains.${tile.key}`)}</Txt>
                  <Txt style={styles.tileValue}>
                    {formatAmount(tile.value)}
                    <Txt style={styles.unit}> TND</Txt>
                  </Txt>
                </Card>
              ))}
            </View>
            <Txt style={styles.hint}>{t('gains.hint')}</Txt>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.lg },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', color: colors.neutral[900] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  // Deux tuiles par ligne : 48 % laisse la gouttière respirer.
  tile: { width: '48%', gap: spacing.xs },
  tileLabel: { fontSize: fontSize.sm, color: colors.neutral[500], fontWeight: '600' },
  // VERT = la valeur (règle de la charte).
  tileValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.green[700] },
  unit: { fontSize: fontSize.sm, fontWeight: '600', color: colors.green[700] },
  hint: { fontSize: fontSize.sm, color: colors.neutral[500] },
});
