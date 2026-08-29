import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { MyRequestsTabs } from './MyRequestsTabs';
import { MyRequestsList } from './MyRequestsList';
import type { MyRequestDto } from '../api/dto';

// MyRequestCard appelle useAcceptCounter, donc useQueryClient : la liste ne
// peut pas se rendre hors d'un QueryClientProvider.
function rendreAvecQueryClient(noeud: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{noeud}</QueryClientProvider>,
  );
}

const mockUseMyRequests = jest.fn();
jest.mock('../api/useMyRequests', () => ({
  useMyRequests: () => mockUseMyRequests(),
}));

function demande(id: number, status: MyRequestDto['status']): MyRequestDto {
  return {
    id,
    job: id,
    status,
    proposed_price: '85.00',
    payment_method: 'DIGITAL',
    counter_price: status === 'COUNTERED' ? '95.00' : null,
    response_message: '',
    job_pickup: 'Sfax',
    job_dropoff: 'Tunis',
    job_date: '2026-09-10T09:00:00Z',
    created_at: '2026-09-01T09:00:00Z',
  };
}

describe('MyRequestsTabs', () => {
  it('affiche un compteur seulement quand l onglet en a', () => {
    render(
      <MyRequestsTabs
        actif="attente"
        compteurs={{ attente: 2, negociation: 0, 'a-payer': 1, terminees: 0 }}
        onSelect={jest.fn()}
      />,
    );

    const attente = screen.getByTestId('mes-demandes-onglet-attente');
    expect(within(attente).getByText(/· 2$/)).toBeTruthy();
    // Un « · 0 » ferait du bruit sur les onglets vides.
    const negociation = screen.getByTestId('mes-demandes-onglet-negociation');
    expect(within(negociation).queryByText(/·/)).toBeNull();
  });

  it('marque l onglet actif pour les lecteurs d ecran', () => {
    render(
      <MyRequestsTabs
        actif="negociation"
        compteurs={{ attente: 0, negociation: 1, 'a-payer': 0, terminees: 0 }}
        onSelect={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId('mes-demandes-onglet-negociation').props
        .accessibilityState.selected,
    ).toBe(true);
    expect(
      screen.getByTestId('mes-demandes-onglet-attente').props.accessibilityState
        .selected,
    ).toBe(false);
  });

  it('remonte l onglet choisi', () => {
    const onSelect = jest.fn();
    render(
      <MyRequestsTabs
        actif="attente"
        compteurs={{ attente: 0, negociation: 0, 'a-payer': 0, terminees: 0 }}
        onSelect={onSelect}
      />,
    );

    fireEvent.press(screen.getByTestId('mes-demandes-onglet-a-payer'));
    expect(onSelect).toHaveBeenCalledWith('a-payer');
  });
});

describe('MyRequestsList filtree par onglet', () => {
  it('ne montre que les demandes de l onglet demande', () => {
    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [demande(1, 'PENDING'), demande(2, 'COUNTERED')],
    });

    rendreAvecQueryClient(<MyRequestsList onglet="negociation" />);

    // La contre-proposition porte son prix ; la demande en attente, non.
    expect(screen.queryByText(/95/)).toBeTruthy();
    expect(screen.queryByTestId('mes-demandes-vide')).toBeNull();
  });

  it('explique le vide de CET onglet, pas un vide general', () => {
    // « Aucune demande envoyee » serait faux quand deux demandes existent
    // dans un autre onglet.
    mockUseMyRequests.mockReturnValue({
      isLoading: false,
      data: [demande(1, 'PENDING')],
    });

    rendreAvecQueryClient(<MyRequestsList onglet="a-payer" />);

    const vide = screen.getByTestId('mes-demandes-vide');
    expect(within(vide).getByText(/à payer/i)).toBeTruthy();
  });
});
