import { requestSchema, type RequestFormValues } from './requestSchema';

// Valeurs minimales valides : description + prix. Tout le reste décrit la
// marchandise et reste facultatif côté serveur — le schéma ne doit donc pas
// exiger plus que lui.
const MINIMAL: RequestFormValues = {
  goodsType: 'TRANSPORT',
  weightKg: '',
  volumeM3: '',
  description: 'Deux palettes de carrelage',
  pickupGov: '',
  pickupAddress: '',
  day: '',
  fromTime: '',
  untilTime: '',
  price: '200',
  method: 'DIGITAL',
};

function valide(patch: Partial<RequestFormValues> = {}) {
  return requestSchema.safeParse({ ...MINIMAL, ...patch });
}

/** Chemins des erreurs remontées, pour vérifier où le message se pose. */
function chemins(resultat: ReturnType<typeof valide>): string[] {
  return resultat.success ? [] : resultat.error.issues.map((i) => i.path.join('.'));
}

describe('requestSchema', () => {
  it('accepte une demande réduite à la description et au prix', () => {
    expect(valide().success).toBe(true);
  });

  it('exige la description : le transporteur décide sur elle', () => {
    const r = valide({ description: '   ' });
    expect(r.success).toBe(false);
    expect(chemins(r)).toContain('description');
  });

  describe('poids et volume', () => {
    it('acceptent le vide — ne pas répondre est une réponse', () => {
      expect(valide({ weightKg: '', volumeM3: '' }).success).toBe(true);
    });

    it('acceptent un décimal positif', () => {
      expect(valide({ weightKg: '450.5', volumeM3: '3.2' }).success).toBe(true);
    });

    it('refusent zéro, qui se lirait comme une donnée renseignée', () => {
      expect(chemins(valide({ weightKg: '0' }))).toContain('weightKg');
      expect(chemins(valide({ volumeM3: '0' }))).toContain('volumeM3');
    });

    it('refusent le texte et les valeurs à trois décimales', () => {
      expect(chemins(valide({ weightKg: 'lourd' }))).toContain('weightKg');
      expect(chemins(valide({ weightKg: '1.234' }))).toContain('weightKg');
    });
  });

  describe('créneau de retrait', () => {
    it('reste facultatif tant qu\'aucun jour n\'est choisi', () => {
      expect(valide({ day: '', fromTime: '', untilTime: '' }).success).toBe(true);
    });

    it('exige les deux heures dès qu\'un jour est choisi', () => {
      const r = valide({ day: '2026-09-10', fromTime: '08:00', untilTime: '' });
      expect(r.success).toBe(false);
      expect(chemins(r)).toContain('fromTime');
    });

    it('refuse une fin antérieure au début, sur le champ de fin', () => {
      const r = valide({ day: '2026-09-10', fromTime: '14:00', untilTime: '09:00' });
      expect(r.success).toBe(false);
      expect(chemins(r)).toContain('untilTime');
    });

    it('refuse un créneau de durée nulle', () => {
      const r = valide({ day: '2026-09-10', fromTime: '09:00', untilTime: '09:00' });
      expect(r.success).toBe(false);
    });

    it('accepte un créneau cohérent', () => {
      expect(
        valide({ day: '2026-09-10', fromTime: '09:00', untilTime: '12:00' }).success,
      ).toBe(true);
    });
  });

  describe('adresse de retrait', () => {
    it('reste facultative', () => {
      expect(valide({ pickupAddress: '', pickupGov: '' }).success).toBe(true);
    });

    it('exige le gouvernorat dès qu\'une adresse est saisie', () => {
      const r = valide({ pickupAddress: '12 rue de Marseille', pickupGov: '' });
      expect(r.success).toBe(false);
      expect(chemins(r)).toContain('pickupGov');
    });

    it('accepte le couple complet', () => {
      expect(
        valide({ pickupAddress: '12 rue de Marseille', pickupGov: 'Sousse' }).success,
      ).toBe(true);
    });

    it('accepte un gouvernorat seul — un corridor suffit à décider', () => {
      expect(valide({ pickupGov: 'Sousse' }).success).toBe(true);
    });
  });

  describe('prix', () => {
    it('refuse un montant non numérique', () => {
      expect(chemins(valide({ price: 'cher' }))).toContain('price');
    });

    it('accepte deux décimales', () => {
      expect(valide({ price: '199.99' }).success).toBe(true);
    });
  });
});
