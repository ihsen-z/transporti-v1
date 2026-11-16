import { etapesVisibles, garantiesVisibles } from './explainerContent';

describe('contenu de « comment ça marche » selon le paiement en ligne', () => {
  it('en espèces seules : l étape de paiement passe à la variante espèces', () => {
    const cles = etapesVisibles('CLIENT', false).map((e) => e.cle);
    expect(cles).toContain('pay_cash');
    expect(cles).not.toContain('pay');
  });

  it('en espèces seules : plus d étape « confirmez la réception » ni de garantie séquestre', () => {
    expect(etapesVisibles('CLIENT', false).map((e) => e.cle)).not.toContain('confirm');
    expect(garantiesVisibles(false).map((g) => g.cle)).not.toContain('escrow');
  });

  it('avec paiement en ligne : parcours complet inchangé', () => {
    expect(etapesVisibles('CLIENT', true).map((e) => e.cle)).toEqual([
      'search', 'compare', 'request', 'pay', 'track', 'confirm',
    ]);
    expect(garantiesVisibles(true).map((g) => g.cle)).toContain('escrow');
  });

  it('transporteur en espèces seules : plus d étape retrait, gains en variante espèces', () => {
    const cles = etapesVisibles('TRANSPORTER', false).map((e) => e.cle);
    expect(cles).not.toContain('withdraw');
    expect(cles).not.toContain('earn');
    expect(cles).toEqual(['publish', 'decide', 'start', 'deliver', 'earn_cash']);
  });

  it('transporteur avec paiement en ligne : parcours complet inchangé', () => {
    expect(etapesVisibles('TRANSPORTER', true).map((e) => e.cle)).toEqual([
      'publish', 'decide', 'start', 'deliver', 'earn', 'withdraw',
    ]);
  });
});
