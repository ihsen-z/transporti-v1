import {
  GOVERNORATES,
  distanceKm,
  findGovernorate,
  gouvernoratsVoisins,
  resolveGovernorateCode,
} from './governorates';

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

describe('gouvernoratsVoisins', () => {
  it('rend les voisins du plus proche au plus lointain', () => {
    const voisins = gouvernoratsVoisins('Sousse');
    expect(voisins.length).toBeGreaterThan(0);
    const distances = voisins.map((v) => distanceKm(findGovernorate('Sousse')!, v));
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it("n'inclut jamais le gouvernorat de depart", () => {
    expect(gouvernoratsVoisins('Sousse').map((v) => v.code)).not.toContain('Sousse');
  });

  it('respecte le rayon et le plafond', () => {
    const depart = findGovernorate('Tunis')!;
    const voisins = gouvernoratsVoisins('Tunis', 40, 2);
    expect(voisins.length).toBeLessThanOrEqual(2);
    voisins.forEach((v) => expect(distanceKm(depart, v)).toBeLessThanOrEqual(40));
  });

  it('rend une liste vide pour un code inconnu, sans lever', () => {
    expect(gouvernoratsVoisins('Atlantide')).toEqual([]);
  });

  it('ne propose personne quand le rayon est trop court', () => {
    // Un rayon nul ne doit pas rendre « le moins loin » par defaut : proposer
    // un gouvernorat a 90 km comme « voisin » serait une contrainte deguisee.
    expect(gouvernoratsVoisins('Tataouine', 1)).toEqual([]);
  });
});

describe('distanceKm', () => {
  it('est nulle pour un point avec lui-meme', () => {
    const g = findGovernorate('Sfax')!;
    expect(distanceKm(g, g)).toBeCloseTo(0, 6);
  });

  it('est symetrique', () => {
    const a = findGovernorate('Tunis')!;
    const b = findGovernorate('Sfax')!;
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
  });

  it('donne un ordre de grandeur juste sur Tunis - Sfax (~235 km a vol d oiseau)', () => {
    const d = distanceKm(findGovernorate('Tunis')!, findGovernorate('Sfax')!);
    expect(d).toBeGreaterThan(200);
    expect(d).toBeLessThan(280);
  });
});
