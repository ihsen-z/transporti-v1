import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { RouteUnavailable } from './RouteUnavailable';

// Lot 7.6 (E-19) — quatre routes profondes rendaient un ecran vide, une liste
// « Aucune demande » mensongere, ou un squelette de chargement perpetuel quand
// leur identifiant ne menait nulle part. Toutes sont atteignables d'un tap de
// notification.

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: mockCanGoBack,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
});

describe('RouteUnavailable', () => {
  it('dit que la page est inaccessible, sans parler d erreur', () => {
    // Rien n'est « inattendu » ici : le lien ne mene nulle part. Reutiliser
    // ErrorScreen (« une erreur inattendue est survenue ») serait aussi faux
    // que se taire.
    render(<RouteUnavailable />);
    expect(screen.getByText("Cette page n'est pas accessible")).toBeTruthy();
    expect(screen.getByTestId('route-unavailable-back')).toBeTruthy();
  });

  it('accepte un message propre a l ecran', () => {
    render(<RouteUnavailable message="Cette mission a ete annulee." />);
    expect(screen.getByText('Cette mission a ete annulee.')).toBeTruthy();
  });

  it('revient en arriere quand il y a une pile', () => {
    render(<RouteUnavailable />);
    fireEvent.press(screen.getByTestId('route-unavailable-back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renvoie a l'accueil quand l'app a ete ouverte directement sur la route", () => {
    // Cas reel : un tap de notification ouvre l'app sur `mission/<id>`. Il n'y
    // a alors aucune pile a remonter, et `back()` ne ferait rien — le bouton
    // de sortie n'en serait pas un.
    mockCanGoBack.mockReturnValue(false);
    render(<RouteUnavailable />);
    fireEvent.press(screen.getByTestId('route-unavailable-back'));
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/home');
  });
});
