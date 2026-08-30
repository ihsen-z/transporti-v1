import { render, screen, within } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { LoyalClientsCard } from './LoyalClientsCard';
import type { ClientFideleDto, FideliteDto } from '../api/dto';

// T5.5 — pendant transporteur de C5.3. Ces tests fixent la distinction qui
// fait tout l'intérêt de l'écran : un favori qui n'a jamais réservé et un
// client qui revient ne se disent pas de la même façon.

function client(
  id: number,
  extra: Partial<ClientFideleDto> = {},
): ClientFideleDto {
  return {
    client_id: id,
    client_name: `Client ${id}`,
    missions: 0,
    is_favorite: false,
    last_mission_at: null,
    ...extra,
  };
}

function fidelite(extra: Partial<FideliteDto> = {}): FideliteDto {
  return { favorited_by: 0, repeat_clients: 0, clients: [], ...extra };
}

describe('LoyalClientsCard', () => {
  it('rend une ligne par client', () => {
    render(
      <LoyalClientsCard
        fidelite={fidelite({ clients: [client(1), client(2)] })}
      />,
    );
    expect(screen.getAllByTestId('fidelite-client-ligne')).toHaveLength(2);
  });

  it('distingue « jamais réservé » de « zéro mission »', () => {
    // Un favori sans mission n'est pas un client à zéro : c'est un intéressé
    // jamais converti. Afficher « 0 mission » perdrait ce sens.
    render(
      <LoyalClientsCard
        fidelite={fidelite({
          clients: [client(1, { is_favorite: true, missions: 0 })],
        })}
      />,
    );

    const ligne = screen.getByTestId('fidelite-client-ligne');
    expect(within(ligne).getByText(/sans avoir encore réservé/i)).toBeTruthy();
    expect(within(ligne).queryByText(/0 mission/i)).toBeNull();
  });

  it('affiche le nombre de missions quand il y en a', () => {
    render(
      <LoyalClientsCard
        fidelite={fidelite({ clients: [client(1, { missions: 3 })] })}
      />,
    );
    expect(screen.getByText(/3 mission/i)).toBeTruthy();
  });

  it('garde les deux compteurs séparés, sans score combiné', () => {
    // 2 favoris + 1 récurrent ne fait pas « 3 clients fidèles » : les deux
    // signaux ne s'additionnent pas.
    render(
      <LoyalClientsCard
        fidelite={fidelite({ favorited_by: 2, repeat_clients: 1 })}
      />,
    );

    expect(screen.getByTestId('fidelite-favoris')).toBeTruthy();
    expect(screen.getByTestId('fidelite-recurrents')).toBeTruthy();
    expect(screen.queryByText(/\b3 client/i)).toBeNull();
  });

  it('explique le vide au lieu de laisser une carte muette', () => {
    render(<LoyalClientsCard fidelite={fidelite()} />);
    expect(screen.getByTestId('fidelite-vide')).toBeTruthy();
  });
});
