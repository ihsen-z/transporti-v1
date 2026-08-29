import {
  ONGLETS_DEMANDES,
  compterParOnglet,
  ongletDeLaDemande,
  type OngletDemande,
} from './onglets';
import type { MyRequestStatus } from '../api/dto';

// C2.1 — le tri par « qui doit agir » est la promesse de l'écran. S'il se
// dérègle, une contre-proposition en attente de décision se perd dans les
// demandes closes, et le client ne le voit jamais.

describe('ongletDeLaDemande', () => {
  const attendu: Record<MyRequestStatus, OngletDemande> = {
    PENDING: 'attente',
    COUNTERED: 'negociation',
    ACCEPTED: 'a-payer',
    REJECTED: 'terminees',
    CANCELLED: 'terminees',
  };

  it.each(Object.entries(attendu))(
    'range une demande %s dans %s',
    (statut, onglet) => {
      expect(ongletDeLaDemande({ status: statut as MyRequestStatus })).toBe(
        onglet,
      );
    },
  );

  it('couvre TOUS les statuts du contrat, sans trou', () => {
    // Un statut ajouté au DTO sans règle ici tomberait silencieusement dans
    // « terminees » et disparaîtrait de la vue du client.
    const statuts = Object.keys(attendu) as MyRequestStatus[];
    expect(statuts).toHaveLength(5);
    statuts.forEach((s) => {
      expect(ONGLETS_DEMANDES).toContain(ongletDeLaDemande({ status: s }));
    });
  });
});

describe('compterParOnglet', () => {
  it('compte chaque onglet, y compris ceux restés vides', () => {
    const compteurs = compterParOnglet([
      { status: 'PENDING' },
      { status: 'PENDING' },
      { status: 'COUNTERED' },
      { status: 'CANCELLED' },
    ]);

    expect(compteurs).toEqual({
      attente: 2,
      negociation: 1,
      'a-payer': 0,
      terminees: 1,
    });
  });

  it('rend zero et non undefined sur une liste vide', () => {
    // Un `undefined` afficherait « · NaN » sur la pastille.
    expect(compterParOnglet([])).toEqual({
      attente: 0,
      negociation: 0,
      'a-payer': 0,
      terminees: 0,
    });
  });
});
