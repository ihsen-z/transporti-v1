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
    onRetirerFiltres: jest.fn(),
    onElargirVoisins: jest.fn(),
    voisins: [] as string[],
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

  describe('recherche filtrée sans résultat', () => {
    const FILTREE: MatchParams = { ...CORRIDOR, weight_kg: 5000 };

    it('propose de lever le filtre, pas d\'attendre', () => {
      rendre(FILTREE);
      expect(screen.getByTestId('search-retirer-filtres')).toBeTruthy();
      expect(screen.getByTestId('search-create-alert')).toBeTruthy();
    });

    it('ne conclut pas que le corridor est vide', () => {
      // Sans ce cas, le lot 6.4 aurait reintroduit le defaut que le 6.3
      // venait de corriger : annoncer un corridor vide sans l'avoir regarde.
      rendre(FILTREE);
      expect(screen.queryByText('Aucun trajet retour pour l\'instant')).toBeNull();
      expect(
        screen.getByText('Aucun retour ne correspond à votre marchandise'),
      ).toBeTruthy();
    });

    it('lève les filtres AVANT la date quand les deux sont posés', () => {
      // La contrainte la plus restrictive d'abord, et un seul CTA par ecran.
      rendre({ ...CORRIDOR, date: '2026-09-17', weight_kg: 5000 });
      expect(screen.getByTestId('search-retirer-filtres')).toBeTruthy();
      expect(screen.queryByTestId('search-voir-corridor')).toBeNull();
    });

    it('retire les filtres quand on le demande', () => {
      const props = rendre(FILTREE);
      fireEvent.press(screen.getByTestId('search-retirer-filtres'));
      expect(props.onRetirerFiltres).toHaveBeenCalledTimes(1);
    });
  });

  describe('corridor reellement vide, sans date ni filtre', () => {
    it("n'offre pas d'elargir les dates : il n'y en avait pas", () => {
      rendre(CORRIDOR, { voisins: ['Monastir'] });
      expect(screen.queryByTestId('search-voir-corridor')).toBeNull();
    });

    it('propose les gouvernorats voisins, et les nomme', () => {
      // Seconde sortie du cas sans contrainte (E-09). Ce n'est PAS la demande
      // classique : le terrain a montre que son bassin est peu consulte par
      // les transporteurs individuels.
      rendre(CORRIDOR, { voisins: ['Monastir', 'Mahdia'] });
      expect(screen.getByTestId('search-elargir-voisins')).toBeTruthy();
      expect(screen.getByText('Départs voisins : Monastir, Mahdia.')).toBeTruthy();
    });

    it('elargit quand on le demande', () => {
      const props = rendre(CORRIDOR, { voisins: ['Monastir'] });
      fireEvent.press(screen.getByTestId('search-elargir-voisins'));
      expect(props.onElargirVoisins).toHaveBeenCalledTimes(1);
    });

    it("ne propose rien a elargir quand il n'y a aucun voisin", () => {
      // On a alors regarde partout : l'alerte redevient la seule chose
      // honnete a offrir, et elle reprend le CTA principal.
      rendre(CORRIDOR, { voisins: [] });
      expect(screen.queryByTestId('search-elargir-voisins')).toBeNull();
      expect(screen.getByTestId('search-create-alert')).toBeTruthy();
    });

    it("laisse l'alerte corridor dans tous les cas", () => {
      const props = rendre(CORRIDOR, { voisins: ['Monastir'] });
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
