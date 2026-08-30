import { render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { ClientWalletPanel } from './ClientWalletPanel';
import type { ClientWalletDto } from '../api/dto';

// C5.1 — le portefeuille du client. Ces tests fixent surtout ce que l'écran
// NE doit pas faire : additionner des montants qui décrivent des situations
// différentes, et interroger une vue réservée au client avant son ouverture.

const mockUseClientWallet = jest.fn();
jest.mock('../api/useClientWallet', () => ({
  useClientWallet: (enabled: boolean) => mockUseClientWallet(enabled),
}));

const portefeuille: ClientWalletDto = {
  held: 100,
  released: 60,
  refunded: 25,
  cod_pending: 40,
  history: [
    {
      id: 1,
      job_id: 7,
      status: 'RELEASED',
      amount: 60,
      pickup_governorate: 'Tunis',
      dropoff_governorate: 'Sfax',
      date: '2026-08-30T10:00:00Z',
    },
  ],
};

beforeEach(() => {
  mockUseClientWallet.mockReset();
  mockUseClientWallet.mockReturnValue({ isLoading: false, data: portefeuille });
});

describe('ClientWalletPanel', () => {
  it("n'interroge PAS l'API tant qu'il est fermé", () => {
    // La vue porte RequireRole('CLIENT') : l'appeler hors ouverture ferait des
    // requêtes inutiles, et 403 pour un transporteur.
    render(<ClientWalletPanel visible={false} onClose={jest.fn()} />);
    expect(mockUseClientWallet).toHaveBeenCalledWith(false);
  });

  it('rend les quatre situations, séparément', () => {
    render(<ClientWalletPanel visible onClose={jest.fn()} />);

    for (const cle of ['held', 'released', 'refunded', 'cod_pending']) {
      expect(screen.getByTestId(`portefeuille-client-${cle}`)).toBeTruthy();
    }
  });

  it("n'affiche AUCUN total", () => {
    // 100 + 60 + 25 + 40 = 225. Ce chiffre ne doit exister nulle part : il ne
    // correspond à aucune réalité comptable.
    render(<ClientWalletPanel visible onClose={jest.fn()} />);
    expect(screen.queryByText(/225/)).toBeNull();
  });

  it('avertit que les montants ne se cumulent pas', () => {
    render(<ClientWalletPanel visible onClose={jest.fn()} />);
    expect(screen.getByText(/ne s'additionnent pas/i)).toBeTruthy();
  });

  it('rend le statut du mouvement TEL QUEL', () => {
    // Le traduire en « payé » inventerait une lecture que la machine à états
    // de l'escrow ne garantit pas.
    render(<ClientWalletPanel visible onClose={jest.fn()} />);
    expect(screen.getByText('RELEASED')).toBeTruthy();
  });

  it('explique le vide au lieu de laisser un écran blanc', () => {
    mockUseClientWallet.mockReturnValue({
      isLoading: false,
      data: { ...portefeuille, history: [] },
    });
    render(<ClientWalletPanel visible onClose={jest.fn()} />);
    expect(screen.getByTestId('portefeuille-client-vide')).toBeTruthy();
  });
});
