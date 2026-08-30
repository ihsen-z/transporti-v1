import { render, screen, within } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { CorridorPerformanceCard } from './CorridorPerformanceCard';
import type {
  CorridorSousDesserviDto,
  RevenueParCorridorDto,
} from '../api/dto';

// T5.4 — B-3b était calculé depuis le lot 1 et lu nulle part. Ces tests fixent
// ce que la première interface promet, et surtout ce qu'elle ne doit PAS faire :
// inventer un chiffre, ou occuper l'écran quand elle n'a rien à dire.

function corridor(
  depart: string,
  arrivee: string,
  extra: Partial<RevenueParCorridorDto> = {},
): RevenueParCorridorDto {
  return {
    pickup_governorate: depart,
    dropoff_governorate: arrivee,
    revenue_net: 100,
    missions: 2,
    km: 235,
    return_trip_missions: 1,
    ...extra,
  };
}

const opportunite: CorridorSousDesserviDto = {
  pickup_governorate: 'Tunis',
  dropoff_governorate: 'Sousse',
  demandes: 9,
};

describe('CorridorPerformanceCard', () => {
  it('rend une ligne par corridor', () => {
    render(
      <CorridorPerformanceCard
        corridors={[corridor('Tunis', 'Sfax'), corridor('Sfax', 'Gabès')]}
        opportunites={[]}
      />,
    );

    expect(screen.getAllByTestId('performance-corridor-ligne')).toHaveLength(2);
  });

  it('traite l aller et le retour comme DEUX corridors distincts', () => {
    // C'est le fondement du pivot : Tunis→Sfax et Sfax→Tunis ne se confondent
    // pas, sinon le revenu du retour disparaît dans celui de l'aller.
    render(
      <CorridorPerformanceCard
        corridors={[
          corridor('Tunis', 'Sfax', { revenue_net: 100 }),
          corridor('Sfax', 'Tunis', { revenue_net: 60 }),
        ]}
        opportunites={[]}
      />,
    );

    const lignes = screen.getAllByTestId('performance-corridor-ligne');
    expect(lignes).toHaveLength(2);
    expect(within(lignes[0]).getByText(/Tunis → Sfax/)).toBeTruthy();
    expect(within(lignes[1]).getByText(/Sfax → Tunis/)).toBeTruthy();
  });

  it('disparait quand il n y a rien a dire des DEUX cotes', () => {
    // Deux blocs vides l'un sous l'autre occuperaient l'écran sans rien
    // apprendre. La carte s'efface plutôt que de meubler.
    const { toJSON } = render(
      <CorridorPerformanceCard corridors={[]} opportunites={[]} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('explique le vide quand seules des opportunites existent', () => {
    render(
      <CorridorPerformanceCard corridors={[]} opportunites={[opportunite]} />,
    );

    expect(screen.getByTestId('performance-corridors-vide')).toBeTruthy();
    expect(screen.getByTestId('performance-opportunite')).toBeTruthy();
  });

  it('n affiche pas la section prospective quand elle est vide', () => {
    render(
      <CorridorPerformanceCard
        corridors={[corridor('Tunis', 'Sfax')]}
        opportunites={[]}
      />,
    );

    expect(screen.queryByTestId('performance-opportunites')).toBeNull();
  });
});
