import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { TransporterOnboardingGuide } from './TransporterOnboardingGuide';
import { appStorage } from '@/core/storage/appStorage';

/**
 * T0.4 — le guide de démarrage du transporteur.
 *
 * Ce que ces tests couvrent, et qui ne se voit PAS en regardant l'écran :
 *
 * - chaque étape disparaît quand elle est accomplie. Un guide qui redemande
 *   l'acquis cesse d'être lu, et l'écran ne le dit pas ;
 * - les deux REPLIS quand la donnée manque. Un `?? true` mal placé masquerait
 *   silencieusement une étape à un transporteur qui en a besoin ; c'est
 *   invisible à l'œil, parce qu'un guide avec deux étapes au lieu de trois a
 *   l'air parfaitement normal ;
 * - la source de la vérification. `user.isVerified` du store vaut
 *   `is_phone_verified` : s'en servir masquerait « vérifiez votre identité » à
 *   quiconque a confirmé son numéro. Le test fixe la bonne source.
 */

const mockProfil = jest.fn();
const mockStats = jest.fn();
const mockPush = jest.fn();

jest.mock('@/features/profiles/api/useTransporterProfile', () => ({
  useTransporterProfile: () => mockProfil(),
}));
jest.mock('@/features/stats/api/useTransporterStats', () => ({
  useTransporterStats: () => mockStats(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/core/auth/authStore', () => ({
  useAuthStore: (selecteur: (etat: unknown) => unknown) =>
    selecteur({
      // `isVerified` est VOLONTAIREMENT à true ici : c'est la vérification du
      // TÉLÉPHONE. Si le composant s'en servait, l'étape « vérifiez votre
      // identité » disparaîtrait alors qu'elle ne doit pas.
      user: { id: 51, role: 'TRANSPORTER', isVerified: true },
    }),
}));

// Les panneaux montés par le guide tirent leurs propres données : on les neutralise
// pour que ces tests ne portent que sur la logique d'étapes.
jest.mock('@/features/profiles/components/ServiceAreasPanel', () => ({
  ServiceAreasPanel: () => null,
}));
jest.mock('@/features/trust/components/TrustPanel', () => ({
  TrustPanel: () => null,
}));

function rendre() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TransporterOnboardingGuide />
    </QueryClientProvider>,
  );
}

function profil({ verifie = false, zones = [] as string[] } = {}) {
  return { data: { is_verified: verifie, service_areas: zones } };
}

beforeEach(() => {
  mockPush.mockReset();
  appStorage.remove('transporti_guide_transporteur_masque_51');
  mockProfil.mockReturnValue(profil());
  mockStats.mockReturnValue({ data: { return_trips_published: 0 } });
});

describe('TransporterOnboardingGuide', () => {
  it('affiche les trois etapes quand rien n est fait', () => {
    rendre();

    expect(screen.getByTestId('guide-transporteur-etape-verifier')).toBeTruthy();
    expect(screen.getByTestId('guide-transporteur-etape-publier')).toBeTruthy();
    expect(screen.getByTestId('guide-transporteur-etape-zones')).toBeTruthy();
  });

  it('rend des libelles traduits, pas des noms de cle', () => {
    // Les autres tests visent des `testID` : une cle i18n manquante rendrait
    // son propre nom et passerait inapercue. On fixe donc du TEXTE, et sur les
    // trois etapes plus le compteur — un pluriel casse est aussi silencieux.
    rendre();

    expect(screen.getByText('Vos premiers pas')).toBeTruthy();
    expect(screen.getByText('Il reste 3 étapes')).toBeTruthy();
    expect(screen.getByText('Vérifiez votre identité')).toBeTruthy();
    expect(screen.getByText('Publiez votre premier retour')).toBeTruthy();
    expect(screen.getByText('Déclarez vos zones de service')).toBeTruthy();
  });

  it('accorde le compteur au singulier quand il ne reste qu une etape', () => {
    mockProfil.mockReturnValue(profil({ verifie: true, zones: ['Tunis'] }));

    rendre();

    expect(screen.getByText('Il reste 1 étape')).toBeTruthy();
  });

  it('ne lit PAS la verification du telephone pour l etape d identite', () => {
    // Le store expose `isVerified: true` (téléphone) et le profil
    // `is_verified: false` (identité). L'étape doit rester.
    mockProfil.mockReturnValue(profil({ verifie: false }));

    rendre();

    expect(screen.getByTestId('guide-transporteur-etape-verifier')).toBeTruthy();
  });

  it('retire l etape d identite quand l identite est verifiee', () => {
    mockProfil.mockReturnValue(profil({ verifie: true }));

    rendre();

    expect(screen.queryByTestId('guide-transporteur-etape-verifier')).toBeNull();
    expect(screen.getByTestId('guide-transporteur-etape-publier')).toBeTruthy();
  });

  it('retire l etape des zones quand une zone est declaree', () => {
    mockProfil.mockReturnValue(profil({ zones: ['Sousse'] }));

    rendre();

    expect(screen.queryByTestId('guide-transporteur-etape-zones')).toBeNull();
  });

  it('retire l etape de publication apres un premier retour publie', () => {
    mockStats.mockReturnValue({ data: { return_trips_published: 2 } });

    rendre();

    expect(screen.queryByTestId('guide-transporteur-etape-publier')).toBeNull();
  });

  it('garde l etape de publication quand les stats manquent', () => {
    // Le repli qui compte. `?? true` aurait masqué l'étape la plus importante
    // du pivot dès qu'une requête de stats échoue — sans aucun signal.
    mockStats.mockReturnValue({ data: undefined });

    rendre();

    expect(screen.getByTestId('guide-transporteur-etape-publier')).toBeTruthy();
  });

  it('n affiche rien tant que le profil n est pas lu', () => {
    // Afficher les trois étapes en attendant proposerait à un transporteur
    // déjà en règle de refaire ce qu'il a fait.
    mockProfil.mockReturnValue({ data: undefined });

    rendre();

    expect(screen.queryByTestId('guide-transporteur')).toBeNull();
  });

  it('disparait entierement quand les trois etapes sont faites', () => {
    mockProfil.mockReturnValue(profil({ verifie: true, zones: ['Tunis'] }));
    mockStats.mockReturnValue({ data: { return_trips_published: 1 } });

    rendre();

    expect(screen.queryByTestId('guide-transporteur')).toBeNull();
  });

  it('le masquage survit au remontage', () => {
    const premier = rendre();
    fireEvent.press(screen.getByTestId('guide-transporteur-masquer'));
    expect(screen.queryByTestId('guide-transporteur')).toBeNull();
    premier.unmount();

    // Sans persistance, le guide reviendrait au prochain affichage de
    // l'Accueil — c'est-à-dire à chaque navigation.
    rendre();
    expect(screen.queryByTestId('guide-transporteur')).toBeNull();
  });

  it('l etape de publication mene a l ecran de publication', () => {
    rendre();
    fireEvent.press(screen.getByTestId('guide-transporteur-etape-publier'));

    expect(mockPush).toHaveBeenCalledWith('/publish');
  });
});
