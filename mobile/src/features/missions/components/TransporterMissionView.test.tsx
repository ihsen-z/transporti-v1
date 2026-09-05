import { render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { TransporterMissionView } from './TransporterMissionView';
import type { TripRequestDto } from '@/features/requests/api/dto';

// Lot 7.1 (E-12, story T-13) — le transporteur n'avait ni jalons, ni fil
// d'evenements, ni detail de marchandise, alors que la cliente disposait de
// tout cela. Tout tenait dans MissionCard, sur l'Accueil.

const mockUseJobDetail = jest.fn();
const mockUseJobRequests = jest.fn();

jest.mock('@/features/tracking/api/useJobDetail', () => ({
  useJobDetail: () => mockUseJobDetail(),
}));
jest.mock('@/features/requests/api/useJobRequests', () => ({
  useJobRequests: () => mockUseJobRequests(),
}));

function demande(over: Partial<TripRequestDto> = {}): TripRequestDto {
  return {
    id: 1,
    job: 8,
    status: 'ACCEPTED',
    description: 'Deux palettes de carrelage',
    proposed_price: '120.00',
    payment_method: 'DIGITAL',
    counter_price: null,
    response_message: '',
    client_name: 'Leila B.',
    goods_type: 'MOVING',
    weight_kg: '450.50',
    volume_m3: '3.20',
    pickup_address: '12 rue de Marseille',
    pickup_governorate: 'Sousse',
    pickup_from: null,
    pickup_until: null,
    photos: [],
    job_pickup: 'Sousse',
    job_dropoff: 'Tunis',
    job_date: '2026-09-06T09:00:00Z',
    created_at: '2026-09-04T09:00:00Z',
    ...over,
  };
}

const DETAIL = {
  id: 8,
  status: 'IN_PROGRESS',
  pickup_governorate: 'Sousse',
  dropoff_governorate: 'Tunis',
  description: '',
  events: [
    { event: 'CONFIRMED_START', created_at: '2026-09-06T08:00:00Z', pod_photo_url: '' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseJobDetail.mockReturnValue({ data: DETAIL, isLoading: false, isError: false });
  mockUseJobRequests.mockReturnValue({ data: [demande()], isLoading: false, isError: false });
});

describe('TransporterMissionView', () => {
  it('affiche le corridor et le deroule de la mission', () => {
    render(<TransporterMissionView jobId={8} />);
    expect(screen.getByText('Sousse → Tunis')).toBeTruthy();
    expect(screen.getByText('Déroulé de la mission')).toBeTruthy();
  });

  it('affiche la marchandise de la demande ACCEPTEE', () => {
    render(<TransporterMissionView jobId={8} />);
    expect(screen.getByTestId('demande-marchandise')).toBeTruthy();
    expect(screen.getByText('450,5 kg')).toBeTruthy();
    expect(screen.getByText('Client : Leila B.')).toBeTruthy();
  });

  it('ignore les demandes non acceptees', () => {
    // Un trajet recoit plusieurs demandes ; seule celle qui a ete retenue
    // decrit ce que le transporteur va reellement charger.
    mockUseJobRequests.mockReturnValue({
      data: [demande({ id: 2, status: 'PENDING', weight_kg: '9000' })],
      isLoading: false,
      isError: false,
    });
    render(<TransporterMissionView jobId={8} />);
    expect(screen.queryByText('9 000 kg')).toBeNull();
    expect(screen.queryByTestId('demande-marchandise')).toBeNull();
  });

  it('ne duplique PAS les actions de la carte d accueil', () => {
    // L'ecran SUIT la mission, il ne la pilote pas : dupliquer la cloture
    // ferait deux sources pour la meme mutation.
    render(<TransporterMissionView jobId={8} />);
    expect(screen.queryByText('Marquer livré')).toBeNull();
    expect(screen.queryByText('Code de livraison (4 chiffres)')).toBeNull();
  });

  it('rend une sortie quand la mission est inatteignable', () => {
    mockUseJobDetail.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<TransporterMissionView jobId={999999} />);
    expect(screen.getByTestId('route-unavailable')).toBeTruthy();
  });
});
