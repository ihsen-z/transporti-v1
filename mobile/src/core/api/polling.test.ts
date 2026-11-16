import { POLL_INTERVAL_MS, SERVER_REQUESTS_PER_MINUTE, worstCaseRequestsPerMinute } from './polling';

describe('cadences de sondage', () => {
  it("laissent au pire cas au moins 15 % du budget du serveur aux gestes de l'utilisateur", () => {
    // Avant ce module : 6 + 4 + 4 + 12 = 26 requêtes par minute, au-dessus des
    // ~16,7 que le serveur accepte. Le sondage seul déclenchait le limiteur.
    expect(worstCaseRequestsPerMinute()).toBeLessThanOrEqual(SERVER_REQUESTS_PER_MINUTE * 0.85);
    expect(worstCaseRequestsPerMinute()).toBeLessThan(SERVER_REQUESTS_PER_MINUTE);
  });

  it('additionne bien chaque sondage, en prenant le rôle le plus gourmand', () => {
    // Communs 1 + 1 + 2 + 7,5 = 11,5 ; transporteur + 2 listes = 13,5
    // (la cliente n'ajoute qu'une liste : 12,5).
    expect(worstCaseRequestsPerMinute()).toBeCloseTo(13.5);
  });

  it('sonde les trois listes de travail toutes les 60 s', () => {
    expect(POLL_INTERVAL_MS.receivedRequests).toBe(60_000);
    expect(POLL_INTERVAL_MS.myRequests).toBe(60_000);
    expect(POLL_INTERVAL_MS.myMissions).toBe(60_000);
  });

  it("n'interroge jamais plus vite que toutes les 5 secondes", () => {
    for (const intervalle of Object.values(POLL_INTERVAL_MS)) {
      expect(intervalle).toBeGreaterThanOrEqual(5_000);
    }
  });
});
