import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFloatingTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/auth/authStore';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import { HomeTopBar } from '@/features/dashboard/components/HomeTopBar';
import { TransporterHero } from '@/features/dashboard/components/TransporterHero';
import { MissionsList } from '@/features/missions/components/MissionsList';
import { CompletedMissionsList } from '@/features/reviews/components/CompletedMissionsList';
import { ReturnPromptBanner } from '@/features/trips/components/ReturnPromptBanner';
import { ReturnsHubSection } from '@/features/trips/components/ReturnsHubSection';
import { Button } from '@/shared/ui/Button';
import { TransporterOnboardingGuide } from '@/features/onboarding/components/TransporterOnboardingGuide';
import { ClientHomeSearch } from '@/features/search/components/ClientHomeSearch';
import { ClientRequestsSummary } from '@/features/my-requests/components/ClientRequestsSummary';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { colors, spacing } from '@/shared/theme';

// Onglet Accueil, rôle-aware. Pour le transporteur c'est le tableau de bord de
// design-system/10-transporteur-dashboard.html : hero chiffré, CTA unique,
// puis ses sections. Le client garde un hero de marque — les KPI du pivot
// (remplissage, km transformés) ne veulent rien dire pour lui.
export default function HomeScreen() {
  // Marge basse reservee sous la liste : sans elle, le dernier element
  // reste sous la barre flottante et son action devient inatteignable
  // (defaut mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useFloatingTabBarClearance();
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
        contentContainerStyle={[styles.content, { paddingBottom: margeBasse }]}
        refreshControl={isTransporter ? queryRefreshControl(stats) : undefined}
      >
        <HomeTopBar />

        {/* 7.5 — le bandeau de marque cede la place a la recherche elle-meme
            (E-17). Il occupait le premier tiers d'un ecran vide aux deux
            autres, et ne disait a la cliente rien qu'elle ne sache deja. La
            cartographie assume qu'elle n'a pas de tableau de bord et que sa
            racine est la recherche : autant l'y mettre. */}
        {isTransporter ? (
          <TransporterHero stats={stats.data} loading={stats.isLoading} />
        ) : (
          <ClientHomeSearch />
        )}

        {/* CTA unique de l'écran — le seul orange autorisé ici. */}
        {isTransporter ? (
          <Button
            testID="home-publish"
            label={t('trips.publish.title')}
            onPress={() => router.push('/publish')}
            variant="cta"
          />
        ) : null}
        {/* Le bouton « Trouver un retour » a disparu : le formulaire porte
            desormais son propre CTA, et deux oranges sur un ecran violeraient
            la charte. */}
        {isClient ? <ClientRequestsSummary /> : null}

        {/* La maquette place ici « Demandes reçues » avec ses cartes.
            L'endpoint transverse existe depuis T2.1
            (GET trip-requests/received/) et l'onglet Demandes porte desormais
            la liste consolidee. Le dupliquer ici ferait deux sources pour la
            meme information, donc deux compteurs a tenir d'accord. */}

        {/* Sections rôle-aware. Le suivi des demandes du client vit désormais
            dans son propre onglet (mes-demandes.tsx) : une section noyée en
            bas de l'Accueil, sans pull-to-refresh ni existence dans la barre
            de navigation, ne servait pas le principe de suivi du BO. */}
        {/* T4.4 — l'amorce de retour a vide, en premiere position : a cet
            instant, c'est l'action la plus rentable de l'ecran. */}
        {isTransporter ? <ReturnPromptBanner /> : null}
        {/* T0.4 — le guide de demarrage, APRES l'amorce de retour et non avant.
            L'amorce ne parait qu'apres une livraison et vise l'instant precis
            ou la publication est evidente ; le guide, lui, reste tant qu'il
            reste une etape. Le mettre en premier repousserait l'action la plus
            rentable de l'ecran sous une liste de taches. Il se masque de
            lui-meme quand les trois etapes sont faites. */}
        {isTransporter ? <TransporterOnboardingGuide /> : null}
        {/* T1.1 — le hub passe de « mes missions » a « mes retours » : le
            retour est la racine du transporteur (IA-2). */}
        {isTransporter ? <ReturnsHubSection /> : null}
        {isTransporter ? <MissionsList /> : null}
        {isTransporter ? <CompletedMissionsList /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral[50] },
  content: { padding: spacing.xl, gap: spacing.xl },
  section: { marginBottom: -spacing.md },
});
