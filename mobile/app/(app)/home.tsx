import { useTabBarClearance } from '@/shared/ui/FloatingTabBar';
import { useAuthStore } from '@/core/auth/authStore';
import { useTransporterStats } from '@/features/stats/api/useTransporterStats';
import { HomeTopBar } from '@/features/dashboard/components/HomeTopBar';
import { TransporterHero } from '@/features/dashboard/components/TransporterHero';
import { MissionsList } from '@/features/missions/components/MissionsList';
import { CompletedMissionsList } from '@/features/reviews/components/CompletedMissionsList';
import { ReturnPromptBanner } from '@/features/trips/components/ReturnPromptBanner';
import { ReturnsHubSection } from '@/features/trips/components/ReturnsHubSection';
import { AppScreen } from '@/shared/ui/AppScreen';
import { AppHeader } from '@/shared/ui/AppHeader';
import { TransporterOnboardingGuide } from '@/features/onboarding/components/TransporterOnboardingGuide';
import { ClientHomeSearch } from '@/features/search/components/ClientHomeSearch';
import { ClientRequestsSummary } from '@/features/my-requests/components/ClientRequestsSummary';
import { queryRefreshControl } from '@/shared/ui/queryRefreshControl';
import { DebtBanner } from '@/features/wallet/components/DebtBanner';

// Onglet Accueil, rôle-aware. Pour le transporteur c'est le tableau de bord :
// en-tête sur le bandeau bleu, hero chiffré en verre dedans, puis ses sections
// — pas de CTA propre, voir plus bas. La cliente garde le même en-tête, mais
// sa carte de recherche ouvre le contenu : les KPI du pivot (remplissage, km
// transformés) ne veulent rien dire pour elle.
//
// Le hero reste dans l'en-tête et pas dans le contenu, et ce n'est pas
// cosmétique : le verre ne vit que sur le bleu (charte). Descendu d'un cran,
// il finirait sur le fond clair en défilant et s'y dissoudrait.

export default function HomeScreen() {
  // Marge basse reservee sous le contenu : sans elle, le dernier element reste
  // sous la barre de navigation et son action devient inatteignable (defaut
  // mesure sur l'inventaire des retours, recette du 03/09).
  const margeBasse = useTabBarClearance();
  const user = useAuthStore((s) => s.user);
  const isTransporter = user?.role === 'TRANSPORTER';
  const isClient = user?.role === 'CLIENT';

  // Vue protégée par RequireRole('TRANSPORTER') : ne la demande pas pour un client.
  const stats = useTransporterStats(isTransporter);

  return (
    <AppScreen
      testID="home-screen"
      header={
        <AppHeader>
          <HomeTopBar />
          {isTransporter ? (
            <TransporterHero stats={stats.data} loading={stats.isLoading} />
          ) : null}
        </AppHeader>
      }
      refreshControl={isTransporter ? queryRefreshControl(stats) : undefined}
      contentPaddingBottom={margeBasse}
    >
      {/* 7.5 — le bandeau de marque cede la place a la recherche elle-meme
          (E-17). Il occupait le premier tiers d'un ecran vide aux deux
          autres, et ne disait a la cliente rien qu'elle ne sache deja. La
          cartographie assume qu'elle n'a pas de tableau de bord et que sa
          racine est la recherche : autant l'y mettre. */}
      {isClient ? <ClientHomeSearch /> : null}

      {/* Le bouton orange « Publier un retour » a disparu, et c'est la même
          raison qui avait déjà retiré « Trouver un retour » côté cliente : la
          charte n'autorise QU'UN orange par écran, et cet écran en portait
          trois — le bouton flottant de la barre (qui est déjà `publish` pour
          le transporteur, même couleur, même destination, toujours visible),
          ce bouton-ci, et le CTA du bandeau d'amorce.
          Mesuré à l'écran le 06/09 : trois oranges se disputaient la même
          action, et l'amorce contextuelle — la seule des trois à savoir QUEL
          retour publier — était la moins visible. Elle porte désormais seule
          l'orange de l'écran ; hors amorce, c'est le bouton flottant. */}
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
      {/* Dette de commission : prévenir AVANT le blocage, puis l'expliquer.
          En tête, car un transporteur bloqué ne peut rien faire d'autre ici. */}
      {isTransporter ? <DebtBanner /> : null}
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
    </AppScreen>
  );
}
