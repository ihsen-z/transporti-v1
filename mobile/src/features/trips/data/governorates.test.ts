import { GOVERNORATES, findGovernorate } from './governorates';

describe('governorates', () => {
  it('contient les 24 gouvernorats avec coordonnées numériques', () => {
    expect(GOVERNORATES).toHaveLength(24);
    GOVERNORATES.forEach((g) => {
      expect(typeof g.lat).toBe('number');
      expect(typeof g.lng).toBe('number');
      expect(g.code.length).toBeGreaterThan(0);
      expect(g.nameFr.length).toBeGreaterThan(0);
      expect(g.nameAr.length).toBeGreaterThan(0);
    });
  });

  it('findGovernorate résout par code et renvoie undefined sinon', () => {
    expect(findGovernorate('Tunis')?.nameAr).toBe('تونس');
    expect(findGovernorate('Sfax')?.lat).toBeCloseTo(34.7406, 3);
    expect(findGovernorate('Inconnu')).toBeUndefined();
  });
});
