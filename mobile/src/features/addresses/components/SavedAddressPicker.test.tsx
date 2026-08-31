import { render, screen, fireEvent } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { SavedAddressPicker } from './SavedAddressPicker';

/**
 * C5.9 — le sélecteur du carnet dans le formulaire de publication.
 *
 * **C'est le composant qui donne sa valeur au carnet.** Un panneau de gestion
 * que rien ne consomme serait un écran de plus et zéro friction supprimée — le
 * défaut de la moitié prospective de T5.4, livrée puis inerte.
 *
 * Ce que ces tests couvrent, et qui ne se voit pas à l'œil :
 *  - le sélecteur s'efface quand il n'a rien à proposer, au lieu d'occuper de
 *    la hauteur sur un écran de téléphone ;
 *  - un échec de lecture n'affiche PAS un bloc vide trompeur ;
 *  - l'adresse transmise est l'objet COMPLET, gouvernorat inclus. Ne transmettre
 *    que le libellé laisserait l'appelant remplir un seul champ.
 */

const mockCarnet = jest.fn();
jest.mock('../api/useAddresses', () => ({
  useAddresses: () => mockCarnet(),
}));

function adresse(id: number, label: string, governorate = 'Sfax') {
  return {
    id,
    label,
    address: 'Zone industrielle',
    governorate,
    lat: null,
    lng: null,
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-09-01T09:00:00Z',
  };
}

beforeEach(() => {
  mockCarnet.mockReturnValue({ data: [], isError: false, isLoading: false });
});

describe('SavedAddressPicker', () => {
  it('ne rend rien quand le carnet est vide', () => {
    render(<SavedAddressPicker cible="pickup" onChoisir={jest.fn()} />);

    expect(screen.queryByTestId('carnet-selecteur-pickup')).toBeNull();
  });

  it('ne rend rien pendant le chargement', () => {
    mockCarnet.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: true,
    });

    render(<SavedAddressPicker cible="pickup" onChoisir={jest.fn()} />);

    expect(screen.queryByTestId('carnet-selecteur-pickup')).toBeNull();
  });

  it('ne rend rien en cas d echec de lecture', () => {
    // Un confort optionnel ne doit pas parasiter la saisie en cours : le
    // formulaire reste utilisable a la main. Le PANNEAU de gestion, lui,
    // remonte ses erreurs — les deux ecrans ne font pas le meme arbitrage, et
    // c'est voulu.
    mockCarnet.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
    });

    render(<SavedAddressPicker cible="pickup" onChoisir={jest.fn()} />);

    expect(screen.queryByTestId('carnet-selecteur-pickup')).toBeNull();
  });

  it('propose les adresses du carnet', () => {
    mockCarnet.mockReturnValue({
      data: [adresse(1, 'Entrepot'), adresse(2, 'Domicile', 'Tunis')],
      isError: false,
      isLoading: false,
    });

    render(<SavedAddressPicker cible="pickup" onChoisir={jest.fn()} />);

    expect(screen.getByTestId('carnet-selecteur-pickup')).toBeTruthy();
    expect(screen.getByText('Entrepot')).toBeTruthy();
    expect(screen.getByText('Domicile')).toBeTruthy();
  });

  it('transmet l adresse COMPLETE, gouvernorat inclus', () => {
    // Le point qui compte. Ne transmettre que le libelle laisserait l'appelant
    // incapable de remplir le gouvernorat, et l'estimation de prix porterait
    // sur le mauvais corridor sans aucun signal.
    const onChoisir = jest.fn();
    mockCarnet.mockReturnValue({
      data: [adresse(7, 'Depot Monastir', 'Monastir')],
      isError: false,
      isLoading: false,
    });

    render(<SavedAddressPicker cible="dropoff" onChoisir={onChoisir} />);
    fireEvent.press(screen.getByTestId('carnet-choix-dropoff-7'));

    expect(onChoisir).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Depot Monastir',
        governorate: 'Monastir',
        address: 'Zone industrielle',
      }),
    );
  });

  it('distingue les deux cibles par leurs identifiants', () => {
    // Depart et arrivee montent le MEME composant : sans identifiants
    // distincts, un test ne saurait pas lequel il pilote, et un clic sur
    // l'arrivee remplirait le depart sans qu'on le voie.
    mockCarnet.mockReturnValue({
      data: [adresse(3, 'Ailleurs')],
      isError: false,
      isLoading: false,
    });

    render(<SavedAddressPicker cible="dropoff" onChoisir={jest.fn()} />);

    expect(screen.getByTestId('carnet-choix-dropoff-3')).toBeTruthy();
    expect(screen.queryByTestId('carnet-choix-pickup-3')).toBeNull();
  });
});
