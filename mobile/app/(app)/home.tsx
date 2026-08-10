import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import { HomeTopBar } from '@/features/dashboard/components/HomeTopBar';
import { TransporterHero } from '@/features/dashboard/components/TransporterHero';
import { MissionsList } from '@/features/missions/components/MissionsList';
import { CompletedMissionsList } from '@/features/reviews/components/CompletedMissionsList';
import { MyRequestsList } from '@/features/my-requests/components/MyRequestsList';
import { Button } from '@/shared/ui/Button';
import { GradientCard } from '@/shared/ui/GradientCard';
import { Txt } from '@/shared/ui/Txt';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing, fontSize } from '@/shared/theme';

// Onglet Accueil, rôle-aware. Pour le transporteur c'est le tableau de bord de
// design-system/10-transporteur-dashboard.html : hero chiffré, CTA unique,
// puis ses sections. Le client garde un hero de marque — les KPI du pivot
// (remplissage, km transformés) ne veulent rien dire pour lui.
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isTransporter = user?.role === 'TRANSPORTER';
  const isClient = user?.role === 'CLIENT';

  // Vue protégée par RequireRole('TRANSPORTER') : ne la demande pas pour un client.
  const stats = useTransporterStats(isTransporter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={isTransporter ? queryRefreshControl(stats) : undefined}
      >
        <HomeTopBar />

        {isTransporter ? (
          <TransporterHero stats={stats.data} loading={stats.isLoading} />
        ) : (
          <GradientCard>
            <Txt style={styles.heroLabel}>{t('app.name')}</Txt>
            <Txt style={styles.heroBig}>{t('app.tagline')}</Txt>
          </GradientCard>
        )}

        {/* CTA unique de l'écran — le seul orange autorisé ici. */}
        {isTransporter ? (
          <Button
            label={t('trips.publish.title')}
            onPress={() => router.push('/publish')}
            variant="cta"
          />
        ) : null}
        {isClient ? (
          <Button
            label={t('search.title')}
            onPress={() => router.push('/search')}
            variant="cta"
          />
        ) : null}

        {/* La maquette place ici « Demandes reçues » avec ses cartes. Non
            livré : les demandes ne sont lisibles que trajet par trajet
            (GET jobs/<id>/requests/), il n'existe aucun endpoint transverse
            pour en faire une liste à plat. Un en-tête suivi de rien se lirait
            comme un écran cassé — l'onglet Demandes assure ce rôle en
            attendant. */}

        {/* Sections rôle-aware. */}
        {isTransporter ? <MissionsList /> : null}
        {isTransporter ? <CompletedMissionsList /> : null}
        {isClient ? <MyRequestsList /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.xl },
  section: { marginBottom: -spacing.md },
  heroLabel: { fontSize: fontSize.sm, color: colors.neutral[0], opacity: 0.85 },
  heroBig: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.neutral[0],
    marginTop: 4,
  },
});
