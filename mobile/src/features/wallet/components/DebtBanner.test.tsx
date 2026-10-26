import { render, screen } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) — Txt() en a besoin.
import { DebtBanner, debtStatus } from './DebtBanner';
import { useWallet } from '../api/useWallet';

jest.mock('../api/useWallet', () => ({ useWallet: jest.fn() }));
const mockUseWallet = useWallet as jest.Mock;

function portefeuille(cod_debt: number, blocked_for_debt: boolean) {
  mockUseWallet.mockReturnValue({
    data: {
      available: 0,
      pending_net: 0,
      released_net: 0,
      cod_collected_net: 0,
      cod_debt,
      commission_debt_limit: 60,
      blocked_for_debt,
      withdrawals_total: 0,
      cod_debts: [],
      history: [],
    },
  });
}

/**
 * Le blocage pour dette ne doit jamais tomber sans prévenir : vu en recette
 * Android 16 le 25/10, un transporteur à 75 TND de dette voyait un accueil
 * normal, puis un refus au moment d'accepter une course.
 */
describe('debtStatus', () => {
  it('ne dit rien sous la moitié du plafond', () => {
    expect(debtStatus(29, 60, false)).toBe('none');
  });

  it('prévient à partir de la moitié du plafond', () => {
    expect(debtStatus(30, 60, false)).toBe('warning');
  });

  it("suit le serveur pour le blocage, même s'il ne s'accorde pas avec le calcul local", () => {
    // Le serveur fait foi : c'est lui qui refuse les courses.
    expect(debtStatus(10, 60, true)).toBe('blocked');
  });
});

describe('DebtBanner', () => {
  it("n'affiche rien sans dette notable", () => {
    portefeuille(0, false);
    render(<DebtBanner />);
    expect(screen.queryByTestId('debt-banner-warning')).toBeNull();
    expect(screen.queryByTestId('debt-banner-blocked')).toBeNull();
  });

  it('avertit avec le montant et le plafond', () => {
    portefeuille(45, false);
    render(<DebtBanner />);
    expect(screen.getByTestId('debt-banner-warning')).toBeTruthy();
    expect(screen.getByText('Commission à régler : 45 / 60 TND')).toBeTruthy();
  });

  it('explique le blocage et sa sortie', () => {
    portefeuille(75, true);
    render(<DebtBanner />);
    expect(screen.getByTestId('debt-banner-blocked')).toBeTruthy();
    expect(screen.getByText('Nouvelles courses suspendues')).toBeTruthy();
    expect(screen.getByText(/atteint 75 TND, au-delà du plafond de 60 TND/)).toBeTruthy();
  });
});
