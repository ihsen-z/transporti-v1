import { clientDoitPayer } from './paiementDu';

/**
 * Régression du 06/09 : en déplaçant le paiement dans la barre d'action fixe
 * de la charte, la condition est sortie du branchement par rôle et le
 * TRANSPORTEUR s'est vu proposer « Payer maintenant » sur une mission qu'il
 * doit encaisser. Le défaut n'était visible qu'en lançant l'application avec
 * une session transporteur — ni `tsc`, ni la relecture ne pouvaient le voir.
 *
 * Ce test le rend visible en CI.
 */
describe('clientDoitPayer', () => {
  it('vrai pour la cliente sur une mission acceptée et digitale', () => {
    expect(clientDoitPayer('CLIENT', 'MATCHED', 'DIGITAL')).toBe(true);
  });

  it('FAUX pour le transporteur, quelle que soit la mission', () => {
    // Le point de la régression : mêmes statut et mode de paiement, autre rôle.
    expect(clientDoitPayer('TRANSPORTER', 'MATCHED', 'DIGITAL')).toBe(false);
  });

  it('faux en espèces : il n y a rien à payer dans l application', () => {
    expect(clientDoitPayer('CLIENT', 'MATCHED', 'COD')).toBe(false);
  });

  it.each(['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OPEN'])(
    'faux au statut %s — le paiement ne se rejoue pas',
    (status) => {
      expect(clientDoitPayer('CLIENT', status, 'DIGITAL')).toBe(false);
    },
  );

  it('faux tant que la mission n est pas chargée (rien à réclamer sans données)', () => {
    expect(clientDoitPayer('CLIENT', undefined, undefined)).toBe(false);
  });

  it('vrai quand le rôle n est pas encore connu mais la mission, si', () => {
    // Rôle absent = session en cours de restauration. On ne prive pas la
    // cliente de son bouton ; seul un TRANSPORTER identifié le perd.
    expect(clientDoitPayer(undefined, 'MATCHED', 'DIGITAL')).toBe(true);
  });
});
