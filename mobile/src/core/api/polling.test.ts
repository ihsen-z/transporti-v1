import { POLL_INTERVAL_MS, SERVER_REQUESTS_PER_MINUTE, worstCaseRequestsPerMinute } from './polling';

describe('cadences de sondage', () => {
  it("laissent au pire cas un quart du budget du serveur aux gestes de l'utilisateur", () => {
    // Avant ce module : 6 + 4 + 4 + 12 = 26 requêtes par minute, au-dessus des
    // ~16,7 que le serveur accepte. Le sondage seul déclenchait le limiteur.
    expect(worstCaseRequestsPerMinute()).toBeLessThanOrEqual(SERVER_REQUESTS_PER_MINUTE * 0.75);
  });

  it('additionne bien chaque sondage', () => {
    // 1 + 1 + 2 + 7,5 = 11,5 requêtes par minute.
    expect(worstCaseRequestsPerMinute()).toBeCloseTo(11.5);
  });

  it("n'interroge jamais plus vite que toutes les 5 secondes", () => {
    for (const intervalle of Object.values(POLL_INTERVAL_MS)) {
      expect(intervalle).toBeGreaterThanOrEqual(5_000);
    }
  });
});
