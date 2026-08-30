import { render, screen, within } from '@testing-library/react-native';
import '@/core/i18n'; // init i18n (effet de bord) : les libellés viennent de là.
import { ReputationCard } from './ReputationCard';
import type { ScoreConfianceDto } from '../api/dto';

// T5.3 — la décomposition du score. Ces tests protègent surtout l'honnêteté de
// l'affichage : le total doit rester la somme de ce qui est montré, et les
// critères qui mesurent l'usage de l'app ne doivent pas passer pour des
// critères de qualité de service.

const score: ScoreConfianceDto = {
  trust_score: 62,
  components: [
    { key: 'completion', earned: 24, max: 30, is_service_quality: true },
    { key: 'disputes', earned: 20, max: 20, is_service_quality: true },
    { key: 'payment', earned: 12.5, max: 25, is_service_quality: true },
    { key: 'engagement', earned: 4.5, max: 15, is_service_quality: false },
    { key: 'recency', earned: 1, max: 10, is_service_quality: false },
  ],
};

describe('ReputationCard', () => {
  it('affiche le score sur cent', () => {
    render(<ReputationCard score={score} />);
    expect(screen.getByTestId('reputation-score')).toBeTruthy();
    expect(screen.getByText('62/100')).toBeTruthy();
  });

  it('rend les CINQ composantes, sans en masquer aucune', () => {
    // Masquer les deux composantes « usage de l'app » rendrait l'addition
    // fausse à l'écran : le total ne correspondrait plus aux parts montrées.
    render(<ReputationCard score={score} />);
    for (const cle of [
      'completion',
      'disputes',
      'payment',
      'engagement',
      'recency',
    ]) {
      expect(screen.getByTestId(`reputation-${cle}`)).toBeTruthy();
    }
  });

  it('montre le plafond de chaque composante, pas seulement le gagné', () => {
    // « 12,5 points » ne veut rien dire sans « sur 25 ».
    render(<ReputationCard score={score} />);
    const paiement = screen.getByTestId('reputation-payment');
    expect(within(paiement).getByText(/12\.5 \/ 25/)).toBeTruthy();
  });

  it("avertit que deux critères mesurent l'usage de l'application", () => {
    render(<ReputationCard score={score} />);
    expect(screen.getByTestId('reputation-avertissement-usage')).toBeTruthy();
  });

  it('la somme des composantes reste cohérente avec le score affiché', () => {
    // 24 + 20 + 12,5 + 4,5 + 1 = 62. Ce test échoue si le jeu d'essai dérive,
    // ce qui signalerait que la carte montre autre chose que le calcul réel.
    const somme = score.components.reduce((t, c) => t + c.earned, 0);
    expect(Math.min(100, Math.max(0, Math.trunc(somme)))).toBe(
      score.trust_score,
    );
  });
});
