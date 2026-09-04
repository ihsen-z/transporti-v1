import { publishSchema, type PublishFormValues } from './publishSchema';

// Lot 7.3 — « publier un retour en moins de 4 saisies ». Le schema est le
// contrat du formulaire : c'est ici que se joue le cout de la publication, et
// si publier coute cher l'inventaire ne s'alimente pas (principe n°1).

const MINIMAL: PublishFormValues = {
  jobType: 'TRANSPORT',
  pickupGov: 'Sfax',
  pickupAddress: '',
  dropoffGov: 'Tunis',
  dropoffAddress: '',
  day: '2026-09-10',
  time: '09:00',
  priceMin: '80',
  priceMax: '120',
  capacity: '',
  description: '',
  instantBooking: false,
};

function valide(patch: Partial<PublishFormValues> = {}) {
  return publishSchema.safeParse({ ...MINIMAL, ...patch });
}

function chemins(r: ReturnType<typeof valide>): string[] {
  return r.success ? [] : r.error.issues.map((i) => i.path.join('.'));
}

describe('publishSchema', () => {
  it('accepte une publication sans aucune adresse', () => {
    // Un retour a vide se cherche par corridor, pas par rue.
    expect(valide().success).toBe(true);
  });

  it('accepte les adresses quand le transporteur les donne', () => {
    expect(
      valide({ pickupAddress: 'Zone Industrielle', dropoffAddress: 'Bab Saadoun' }).success,
    ).toBe(true);
  });

  it('exige toujours les deux gouvernorats : ils portent le matching', () => {
    expect(chemins(valide({ pickupGov: '' }))).toContain('pickupGov');
    expect(chemins(valide({ dropoffGov: '' }))).toContain('dropoffGov');
  });

  it('exige toujours le jour et le creneau', () => {
    expect(chemins(valide({ day: '' }))).toContain('day');
    expect(chemins(valide({ time: '' }))).toContain('time');
  });

  it('refuse un prix non numerique', () => {
    expect(chemins(valide({ priceMin: 'cher' }))).toContain('priceMin');
  });

  it('refuse une fourchette inversee, sur le champ haut', () => {
    expect(chemins(valide({ priceMin: '150', priceMax: '80' }))).toContain('priceMax');
  });

  it('accepte une fourchette a bornes egales', () => {
    expect(valide({ priceMin: '100', priceMax: '100' }).success).toBe(true);
  });
});
