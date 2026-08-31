import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { ServiceAreasPanel } from './ServiceAreasPanel';

/**
 * Zones de service — l'écran qui manquait au mobile.
 *
 * Ce que ces tests couvrent, et qui ne se voit PAS en ouvrant l'écran :
 *
 * - la charge utile envoyée. Un enregistrement qui part avec les codes de la
 *   veille, ou avec les libellés traduits au lieu des codes canoniques, rend un
 *   écran parfaitement normal et une donnée fausse côté serveur. Le backend
 *   compare `pickup_governorate` en `iexact` : un libellé arabe n'y matcherait
 *   jamais, et les opportunités de corridor resteraient vides sans erreur ;
 * - l'échec de LECTURE. S'il rendait une liste vide, le transporteur lirait
 *   « aucune zone déclarée » alors que ses zones existent — et en enregistrant,
 *   il les effacerait toutes ;
 * - zéro zone, qui est un état légitime mais dont la conséquence doit être
 *   annoncée avant l'enregistrement.
 */

const mockProfil = jest.fn();
const mockMutate = jest.fn();
const mockEtatMutation = jest.fn();

jest.mock('../api/useTransporterProfile', () => ({
  useTransporterProfile: () => mockProfil(),
}));

jest.mock('../api/useUpdateServiceAreas', () => ({
  useUpdateServiceAreas: () => ({
    mutate: mockMutate,
    ...mockEtatMutation(),
  }),
}));

function rendre() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ServiceAreasPanel visible onClose={jest.fn()} userId={51} />
    </QueryClientProvider>,
  );
}

function profilAvec(zones: string[]) {
  return {
    data: { service_areas: zones },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

beforeEach(() => {
  mockMutate.mockReset();
  mockEtatMutation.mockReturnValue({
    isPending: false,
    isSuccess: false,
    error: null,
  });
  mockProfil.mockReturnValue(profilAvec([]));
});

describe('ServiceAreasPanel', () => {
  it('pre-selectionne les zones deja declarees', () => {
    mockProfil.mockReturnValue(profilAvec(['Tunis', 'Sfax']));

    rendre();

    expect(screen.getByTestId('service-areas-zone-Tunis').props.accessibilityState)
      .toEqual(expect.objectContaining({ checked: true }));
    expect(screen.getByTestId('service-areas-zone-Sfax').props.accessibilityState)
      .toEqual(expect.objectContaining({ checked: true }));
    // Une zone non declaree ne doit pas apparaitre cochee : sans cette
    // assertion, un composant qui coche tout passerait les deux precedentes.
    expect(screen.getByTestId('service-areas-zone-Sousse').props.accessibilityState)
      .toEqual(expect.objectContaining({ checked: false }));
  });

  it('envoie les CODES canoniques, pas les libelles affiches', () => {
    mockProfil.mockReturnValue(profilAvec(['Tunis']));

    rendre();
    fireEvent.press(screen.getByTestId('service-areas-zone-Sousse'));
    fireEvent.press(screen.getByTestId('service-areas-enregistrer'));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith(['Tunis', 'Sousse']);
  });

  it('retirer une zone la retire de la charge utile', () => {
    mockProfil.mockReturnValue(profilAvec(['Tunis', 'Sfax']));

    rendre();
    fireEvent.press(screen.getByTestId('service-areas-zone-Tunis'));
    fireEvent.press(screen.getByTestId('service-areas-enregistrer'));

    expect(mockMutate).toHaveBeenCalledWith(['Sfax']);
  });

  it('zero zone est enregistrable, mais avertit de la consequence', () => {
    mockProfil.mockReturnValue(profilAvec(['Tunis']));

    rendre();
    // Aucun avertissement tant qu'il reste une zone.
    expect(screen.queryByTestId('service-areas-avertissement')).toBeNull();

    fireEvent.press(screen.getByTestId('service-areas-zone-Tunis'));

    expect(screen.getByTestId('service-areas-avertissement')).toBeTruthy();
    fireEvent.press(screen.getByTestId('service-areas-enregistrer'));
    expect(mockMutate).toHaveBeenCalledWith([]);
  });

  it('un echec de lecture affiche une erreur, jamais une liste vide', () => {
    mockProfil.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: jest.fn(),
    });

    rendre();

    expect(screen.getByTestId('service-areas-erreur')).toBeTruthy();
    // Le point qui compte : aucune pastille rendue. En rendre ferait lire
    // « aucune zone declaree » a un transporteur qui en a, et un enregistrement
    // les effacerait toutes.
    expect(screen.queryByTestId('service-areas-zone-Tunis')).toBeNull();
    expect(screen.queryByTestId('service-areas-enregistrer')).toBeNull();
  });

  it('affiche un chargement tant que les zones ne sont pas lues', () => {
    mockProfil.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    });

    rendre();

    expect(screen.getByTestId('service-areas-chargement')).toBeTruthy();
    expect(screen.queryByTestId('service-areas-enregistrer')).toBeNull();
  });
});
