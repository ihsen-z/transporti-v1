import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { SearchEmptyState } from './SearchEmptyState';
import type { MatchParams } from '../api/dto';

// IA-3 — « jamais de cul-de-sac ». L'état vide de la recherche ne proposait
// qu'une sortie, l'alerte corridor (E-09). Ces tests épinglent la règle : ce
// n'est pas un cas mais deux, et le cas datable doit offrir une sortie
// IMMÉDIATE en plus de la sortie différée.

const CORRIDOR: MatchParams = {
  pickup_governorate: 'Sousse',
  dropoff_governorate: 'Tunis',
};

function rendre(params: MatchParams, sur: Partial<Parameters<typeof SearchEmptyState>[0]> = {}) {
  const props = {
    params,
    onVoirCorridor: jest.fn(),
    onCreerAlerte: jest.fn(),
    alerteCreee: false,
    alertePending: false,
    ...sur,
  };
  render(<SearchEmptyState {...props} />);
  return props;
}

describe('SearchEmptyState', () => {
  describe('recherche datée sans résultat', () => {
    const DATEE: MatchParams = { ...CORRIDOR, date: '2026-09-17' };

    it('offre DEUX sorties nommées, dont une immédiate', () => {
      rendre(DATEE);
      expect(screen.getByTestId('search-voir-corridor')).toBeTruthy();
      expect(screen.getByTestId('search-create-alert')).toBeTruthy();
    });

    it('ne conclut rien sur le corridor : le titre parle du jour', () => {
      rendre(DATEE);
      // Une recherche datée qui ne donne rien ne dit rien du corridor : le
      // serveur n'a regardé qu'une fenêtre de 48 h autour de la date.
      expect(screen.getByText('Aucun retour ce jour-là')).toBeTruthy();
      expect(
        screen.getByText("Le corridor Sousse → Tunis est peut-être servi à d'autres dates."),
      ).toBeTruthy();
    });

    it('élargit au corridor entier quand on le demande', () => {
      const props = rendre(DATEE);
      fireEvent.press(screen.getByTestId('search-voir-corridor'));
      expect(props.onVoirCorridor).toHaveBeenCalledTimes(1);
    });
  });

  describe('recherche sans date sans résultat', () => {
    it("n'offre pas d'élargissement : il n'y a plus rien à élargir", () => {
      rendre(CORRIDOR);
      expect(screen.queryByTestId('search-voir-corridor')).toBeNull();
    });

    it("laisse l'alerte corridor, seule sortie possible aujourd'hui", () => {
      const props = rendre(CORRIDOR);
      fireEvent.press(screen.getByTestId('search-create-alert'));
      expect(props.onCreerAlerte).toHaveBeenCalledTimes(1);
    });
  });

  it("remplace le bouton d'alerte par une confirmation une fois créée", () => {
    rendre(CORRIDOR, { alerteCreee: true });
    expect(screen.queryByTestId('search-create-alert')).toBeNull();
    expect(screen.getByTestId('search-alert-created')).toBeTruthy();
  });
});
