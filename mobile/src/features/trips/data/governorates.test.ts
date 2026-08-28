import { GOVERNORATES, findGovernorate, resolveGovernorateCode } from './governorates';

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

describe('resolveGovernorateCode (T4.4)', () => {
  it('accepte la valeur canonique', () => {
    expect(resolveGovernorateCode('Sfax')).toBe('Sfax');
  });

  it('ignore la casse et les accents, car le backend stocke du texte libre', () => {
    // Le cas qui casserait silencieusement le pre-remplissage de l'amorce.
    expect(resolveGovernorateCode('gabes')).toBe('Gabès');
    expect(resolveGovernorateCode('GABÈS')).toBe('Gabès');
    expect(resolveGovernorateCode('  beja  ')).toBe('Béja');
  });

  it('accepte le nom arabe', () => {
    expect(resolveGovernorateCode('تونس')).toBe('Tunis');
  });

  it('retourne null plutot que de deviner', () => {
    expect(resolveGovernorateCode('Marseille')).toBeNull();
    expect(resolveGovernorateCode('')).toBeNull();
    expect(resolveGovernorateCode(null)).toBeNull();
  });
});
