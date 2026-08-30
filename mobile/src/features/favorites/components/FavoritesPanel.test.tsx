import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { FavoritesPanel } from './FavoritesPanel';
import type { FavoriDto } from '../api/dto';

// C5.3 — `favorites/` et `favorites/toggle/` existaient depuis P2-09 sans
// aucune interface. Ces tests fixent ce que la première promet, et surtout
// deux refus : ne rien inventer quand le backend se tait, et ne pas appeler
// une vue réservée au client tant que le panneau est fermé.

const mockUseFavorites = jest.fn();
const mockMutate = jest.fn();

jest.mock('../api/useFavorites', () => ({
  useFavorites: (enabled: boolean) => mockUseFavorites(enabled),
}));
jest.mock('../api/useToggleFavorite', () => ({
  useToggleFavorite: () => ({ mutate: mockMutate, isPending: false }),
}));

function favori(id: number, extra: Partial<FavoriDto> = {}): FavoriDto {
  return {
    id,
    transporter_id: 100 + id,
    transporter_name: `Transporteur ${id}`,
    favorited_at: '2026-08-30T10:00:00Z',
    ...extra,
  };
}

beforeEach(() => {
  mockUseFavorites.mockReset();
  mockMutate.mockReset();
  mockUseFavorites.mockReturnValue({ isLoading: false, data: [] });
});

describe('FavoritesPanel', () => {
  it("n'interroge PAS l'API tant qu'il est fermé", () => {
    // La vue porte RequireRole('CLIENT') : l'appeler hors ouverture ferait des
    // requêtes inutiles, et 403 pour un transporteur.
    render(<FavoritesPanel visible={false} onClose={jest.fn()} />);
    expect(mockUseFavorites).toHaveBeenCalledWith(false);
  });

  it('interroge une fois ouvert', () => {
    render(<FavoritesPanel visible onClose={jest.fn()} />);
    expect(mockUseFavorites).toHaveBeenCalledWith(true);
  });

  it('rend une ligne par favori', () => {
    mockUseFavorites.mockReturnValue({
      isLoading: false,
      data: [favori(1), favori(2)],
    });
    render(<FavoritesPanel visible onClose={jest.fn()} />);
    expect(screen.getAllByTestId('favoris-ligne')).toHaveLength(2);
  });

  it('tait le compteur de missions quand le backend ne le fournit pas', () => {
    // `total_jobs_completed` est ABSENT sans profil de confiance. Afficher
    // « 0 mission » dévaloriserait un transporteur sur une donnée manquante.
    mockUseFavorites.mockReturnValue({ isLoading: false, data: [favori(1)] });
    render(<FavoritesPanel visible onClose={jest.fn()} />);
    expect(screen.queryByText(/mission/i)).toBeNull();
  });

  it('affiche le compteur quand il vaut zéro et EXISTE', () => {
    // Zéro mission déclaré est une information ; absent n'en est pas une.
    mockUseFavorites.mockReturnValue({
      isLoading: false,
      data: [favori(1, { total_jobs_completed: 0 })],
    });
    render(<FavoritesPanel visible onClose={jest.fn()} />);
    expect(screen.getByText(/0 mission/i)).toBeTruthy();
  });

  it('remonte le retrait au serveur, sans inverser d état local', () => {
    mockUseFavorites.mockReturnValue({ isLoading: false, data: [favori(1)] });
    render(<FavoritesPanel visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByTestId('favoris-retirer'));
    expect(mockMutate).toHaveBeenCalledWith(101);
  });

  it('explique le vide au lieu de laisser un écran blanc', () => {
    render(<FavoritesPanel visible onClose={jest.fn()} />);
    expect(screen.getByTestId('favoris-vide')).toBeTruthy();
  });
});
